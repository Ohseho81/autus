"""
File utilities

Common file operations
"""

from pathlib import Path
from typing import Union, Optional, List
import shutil
import hashlib


def read_file_safe(file_path: Union[str, Path], encoding: str = "utf-8") -> Optional[str]:
    """
    Safely read file with error handling
    
    Args:
        file_path: Path to file
        encoding: File encoding
    
    Returns:
        File contents or None if error
    """
    try:
        with open(file_path, 'r', encoding=encoding) as f:
            return f.read()
    except Exception:
        return None


def write_file_safe(
    file_path: Union[str, Path],
    content: str,
    encoding: str = "utf-8",
    create_dirs: bool = True
) -> bool:
    """
    Safely write file with error handling
    
    Args:
        file_path: Path to file
        content: Content to write
        encoding: File encoding
        create_dirs: Create parent directories if needed
    
    Returns:
        True if successful, False otherwise
    """
    try:
        path = Path(file_path)
        if create_dirs:
            path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(path, 'w', encoding=encoding) as f:
            f.write(content)
        return True
    except Exception:
        return False


def copy_file_safe(
    source: Union[str, Path],
    destination: Union[str, Path],
    create_dirs: bool = True
) -> bool:
    """
    Safely copy file
    
    Args:
        source: Source file path
        destination: Destination file path
        create_dirs: Create parent directories if needed
    
    Returns:
        True if successful, False otherwise
    """
    try:
        src = Path(source)
        dst = Path(destination)
        
        if create_dirs:
            dst.parent.mkdir(parents=True, exist_ok=True)
        
        shutil.copy2(src, dst)
        return True
    except Exception:
        return False


def delete_file_safe(file_path: Union[str, Path]) -> bool:
    """
    Safely delete file
    
    Args:
        file_path: Path to file
    
    Returns:
        True if successful, False otherwise
    """
    try:
        Path(file_path).unlink()
        return True
    except Exception:
        return False


def get_file_hash(file_path: Union[str, Path], algorithm: str = "sha256") -> Optional[str]:
    """
    Get file hash
    
    Args:
        file_path: Path to file
        algorithm: Hash algorithm (sha256, md5, etc.)
    
    Returns:
        Hex digest or None if error
    """
    try:
        path = Path(file_path)
        if not path.exists():
            return None
        
        hash_obj = hashlib.new(algorithm)
        with open(path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_obj.update(chunk)
        
        return hash_obj.hexdigest()
    except Exception:
        return None


def find_files(
    directory: Union[str, Path],
    pattern: str = "*",
    recursive: bool = True
) -> List[Path]:
    """
    Find files matching pattern
    
    Args:
        directory: Directory to search
        pattern: Glob pattern (e.g., "*.py")
        recursive: Search recursively
    
    Returns:
        List of matching file paths
    """
    try:
        dir_path = Path(directory)
        if not dir_path.exists():
            return []
        
        if recursive:
            return list(dir_path.rglob(pattern))
        else:
            return list(dir_path.glob(pattern))
    except Exception:
        return []

