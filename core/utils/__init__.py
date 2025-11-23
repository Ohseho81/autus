"""
Core utilities

Common utilities used across AUTUS
"""

from core.utils.logging import get_logger
from core.utils.paths import ensure_dir, safe_path
from core.utils.files import (
    read_file_safe,
    write_file_safe,
    copy_file_safe,
    delete_file_safe,
    get_file_hash,
    find_files,
)
from core.utils.json_utils import (
    load_json_safe,
    save_json_safe,
    parse_json_safe,
    to_json_safe,
)
from core.utils.hash_utils import (
    hash_string,
    hash_bytes,
    hash_file,
    verify_hash,
)

__all__ = [
    # Logging
    "get_logger",
    # Paths
    "ensure_dir",
    "safe_path",
    # Files
    "read_file_safe",
    "write_file_safe",
    "copy_file_safe",
    "delete_file_safe",
    "get_file_hash",
    "find_files",
    # JSON
    "load_json_safe",
    "save_json_safe",
    "parse_json_safe",
    "to_json_safe",
    # Hash
    "hash_string",
    "hash_bytes",
    "hash_file",
    "verify_hash",
]
