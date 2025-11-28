"""
from __future__ import annotations

Hash utilities

Common hashing operations
"""

import hashlib
from pathlib import Path
from typing import Union, Optional


def hash_string(text: str, algorithm: str = "sha256") -> Optional[str]:
    """
    Hash a string

    Args:
        text: Text to hash
        algorithm: Hash algorithm (sha256, md5, sha1, etc.)

    Returns:
        Hex digest or None if error
    """
    try:
        hash_obj = hashlib.new(algorithm)
        hash_obj.update(text.encode('utf-8'))
        return hash_obj.hexdigest()
    except Exception:
        return None


def hash_bytes(data: bytes, algorithm: str = "sha256") -> Optional[str]:
    """
    Hash bytes

    Args:
        data: Bytes to hash
        algorithm: Hash algorithm

    Returns:
        Hex digest or None if error
    """
    try:
        hash_obj = hashlib.new(algorithm)
        hash_obj.update(data)
        return hash_obj.hexdigest()
    except Exception:
        return None


def hash_file(file_path: Union[str, Path], algorithm: str = "sha256") -> Optional[str]:
    """
    Hash a file

    Args:
        file_path: Path to file
        algorithm: Hash algorithm

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


def verify_hash(data: Union[str, bytes], hash_value: str, algorithm: str = "sha256") -> bool:
    """
    Verify hash of data

    Args:
        data: Data to verify
        hash_value: Expected hash
        algorithm: Hash algorithm

    Returns:
        True if hash matches
    """
    try:
        if isinstance(data, str):
            computed = hash_string(data, algorithm)
        else:
            computed = hash_bytes(data, algorithm)

        return computed is not None and computed.lower() == hash_value.lower()
    except Exception:
        return False
