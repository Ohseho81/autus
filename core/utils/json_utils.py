"""
JSON utilities

Common JSON operations
"""

import json
from typing import Any, Optional, Union
from pathlib import Path


def load_json_safe(file_path: Union[str, Path]) -> Optional[Any]:
    """
    Safely load JSON file

    Args:
        file_path: Path to JSON file

    Returns:
        Parsed JSON data or None if error
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return None


def save_json_safe(
    file_path: Union[str, Path],
    data: Any,
    indent: int = 2,
    create_dirs: bool = True
) -> bool:
    """
    Safely save JSON file

    Args:
        file_path: Path to JSON file
        data: Data to save
        indent: JSON indentation
        create_dirs: Create parent directories if needed

    Returns:
        True if successful, False otherwise
    """
    try:
        path = Path(file_path)
        if create_dirs:
            path.parent.mkdir(parents=True, exist_ok=True)

        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=indent, ensure_ascii=False)
        return True
    except Exception:
        return False


def parse_json_safe(json_str: str) -> Optional[Any]:
    """
    Safely parse JSON string

    Args:
        json_str: JSON string

    Returns:
        Parsed data or None if error
    """
    try:
        return json.loads(json_str)
    except Exception:
        return None


def to_json_safe(data: Any, indent: Optional[int] = None) -> Optional[str]:
    """
    Safely convert data to JSON string

    Args:
        data: Data to convert
        indent: JSON indentation (None for compact)

    Returns:
        JSON string or None if error
    """
    try:
        return json.dumps(data, indent=indent, ensure_ascii=False)
    except Exception:
        return None

