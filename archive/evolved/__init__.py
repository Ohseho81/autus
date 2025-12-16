"""
docker_fix: A utility package for Docker-related fixes and optimizations.

This package provides tools and utilities to help diagnose, fix, and optimize
Docker containers, images, and configurations.
"""

from typing import Dict, Any, Optional
import logging
from pathlib import Path

__version__ = "1.0.0"
__author__ = "Docker Fix Team"
__email__ = "support@dockerfix.com"
__description__ = "Docker diagnostic and fix utilities"

# Package-level logger
logger = logging.getLogger(__name__)

# Default configuration
DEFAULT_CONFIG: Dict[str, Any] = {
    "log_level": "INFO",
    "max_retries": 3,
    "timeout": 30,
    "docker_socket": "/var/run/docker.sock",
    "output_format": "json",
}

# Package exceptions
class DockerFixError(Exception):
    """Base exception for docker_fix package."""
    pass


class DockerConnectionError(DockerFixError):
    """Raised when unable to connect to Docker daemon."""
    pass


class DockerFixConfigError(DockerFixError):
    """Raised when configuration is invalid."""
    pass


def get_version() -> str:
    """
    Get the current version of docker_fix package.
    
    Returns:
        str: Version string in semver format.
    """
    return __version__


def configure_logging(
    level: str = "INFO",
    format_string: Optional[str] = None,
    log_file: Optional[Path] = None
) -> None:
    """
    Configure package-wide logging settings.
    
    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL).
        format_string: Custom log format string.
        log_file: Optional file path for log output.
        
    Raises:
        DockerFixConfigError: If invalid logging configuration provided.
    """
    try:
        log_level = getattr(logging, level.upper())
    except AttributeError as e:
        raise DockerFixConfigError(f"Invalid log level: {level}") from e
    
    if format_string is None:
        format_string = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    handlers = []
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)
    console_handler.setFormatter(logging.Formatter(format_string))
    handlers.append(console_handler)
    
    # File handler if specified
    if log_file:
        try:
            file_handler = logging.FileHandler(log_file)
            file_handler.setLevel(log_level)
            file_handler.setFormatter(logging.Formatter(format_string))
            handlers.append(file_handler)
        except (OSError, IOError) as e:
            raise DockerFixConfigError(f"Cannot create log file {log_file}: {e}") from e
    
    # Configure root logger for the package
    package_logger = logging.getLogger(__name__)
    package_logger.setLevel(log_level)
    
    # Remove existing handlers
    for handler in package_logger.handlers[:]:
        package_logger.removeHandler(handler)
    
    # Add new handlers
    for handler in handlers:
        package_logger.addHandler(handler)


def get_config() -> Dict[str, Any]:
    """
    Get current package configuration.
    
    Returns:
        Dict[str, Any]: Current configuration dictionary.
    """
    return DEFAULT_CONFIG.copy()


def set_config(**kwargs: Any) -> None:
    """
    Update package configuration.
    
    Args:
        **kwargs: Configuration key-value pairs to update.
        
    Raises:
        DockerFixConfigError: If invalid configuration keys provided.
    """
    for key, value in kwargs.items():
        if key not in DEFAULT_CONFIG:
            raise DockerFixConfigError(f"Unknown configuration key: {key}")
        DEFAULT_CONFIG[key] = value
    
    logger.info(f"Configuration updated: {kwargs}")


# Initialize default logging
configure_logging()

# Export public API
__all__ = [
    "__version__",
    "__author__",
    "__email__",
    "__description__",
    "DockerFixError",
    "DockerConnectionError", 
    "DockerFixConfigError",
    "get_version",
    "configure_logging",
    "get_config",
    "set_config",
    "DEFAULT_CONFIG",
]
