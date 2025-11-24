"""
Path utilities

Common path operations
"""
from pathlib import Path
from typing import Union


def ensure_dir(path: Union[str, Path]) -> Path:
    """
    Ensure directory exists, create if not

    Args:
        path: Directory path

    Returns:
        Path object
    """
    path_obj = Path(path)
    path_obj.mkdir(parents=True, exist_ok=True)
    return path_obj


def safe_path(path: Union[str, Path], must_exist: bool = False) -> Path:
    """
    Create safe Path object

    Args:
        path: Path string or Path object
        must_exist: If True, raise error if path doesn't exist

    Returns:
        Path object

    Raises:
        FileNotFoundError: If must_exist=True and path doesn't exist
    """
    path_obj = Path(path)

    if must_exist and not path_obj.exists():
        raise FileNotFoundError(f"Path does not exist: {path_obj}")

    return path_obj

