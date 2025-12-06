"""
AUTUS Logger - Centralized logging system
"""
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

# Ensure logs directory exists
Path("logs").mkdir(exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(name)s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.FileHandler("logs/autus.log"),
        logging.StreamHandler()
    ]
)

# Create AUTUS logger
logger = logging.getLogger("AUTUS")


def log_request(method: str, path: str, status: int, duration: float):
    """Log an HTTP request."""
    level = logging.INFO if status < 400 else logging.WARNING if status < 500 else logging.ERROR
    logger.log(level, f"{method} {path} → {status} ({duration:.2f}ms)")


def log_event(event: str, data: Optional[dict] = None):
    """Log a custom event."""
    logger.info(f"EVENT: {event} | {data or {}}")


def log_error(error: str, details: Optional[dict] = None):
    """Log an error."""
    logger.error(f"ERROR: {error} | {details or {}}")


def log_warning(warning: str, details: Optional[dict] = None):
    """Log a warning."""
    logger.warning(f"WARNING: {warning} | {details or {}}")


def log_debug(message: str, details: Optional[dict] = None):
    """Log debug information."""
    logger.debug(f"DEBUG: {message} | {details or {}}")


def log_evolution(spec_name: str, status: str, details: Optional[dict] = None):
    """Log evolution events."""
    logger.info(f"EVOLUTION: {spec_name} → {status} | {details or {}}")


def log_auth(action: str, user_id: str, success: bool):
    """Log authentication events."""
    level = logging.INFO if success else logging.WARNING
    logger.log(level, f"AUTH: {action} | user={user_id} | success={success}")

