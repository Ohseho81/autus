import logging
from datetime import datetime
from pathlib import Path
from typing import Optional
import json

Path("logs").mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s',
    handlers=[
        logging.FileHandler("logs/autus.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger("AUTUS")

class Monitor:
    def __init__(self):
        self.requests: list = []
        self.errors: list = []
        self.metrics: dict = {}

    def log_request(self, method: str, path: str, status: int, duration: float):
        entry = {
            "timestamp": datetime.now().isoformat(),
            "method": method,
            "path": path,
            "status": status,
            "duration_ms": round(duration, 2)
        }
        self.requests.append(entry)
        if len(self.requests) > 1000:
            self.requests = self.requests[-500:]
        logger.info(f"{method} {path} → {status} ({duration:.2f}ms)")

    def log_error(self, error: str, details: Optional[dict] = None):
        entry = {
            "timestamp": datetime.now().isoformat(),
            "error": error,
            "details": details
        }
        self.errors.append(entry)
        logger.error(f"ERROR: {error} | {details}")

    def get_stats(self) -> dict:
        total = len(self.requests)
        errors = len([r for r in self.requests if r["status"] >= 400])
        avg_duration = sum(r["duration_ms"] for r in self.requests) / max(total, 1)
        return {
            "total_requests": total,
            "error_count": errors,
            "error_rate": round(errors / max(total, 1) * 100, 2),
            "avg_duration_ms": round(avg_duration, 2),
            "recent_errors": self.errors[-10:]
        }

monitor = Monitor()

def log_request(method: str, path: str, status: int, duration: float):
    monitor.log_request(method, path, status, duration)

def log_error(error: str, details=None):
    monitor.log_error(error, details)
