from fastapi import APIRouter, Request
from typing import Dict, Any
from datetime import datetime

class APIGateway:
    def __init__(self):
        self.router = APIRouter()
        self.versions = {}
        self.request_count = 0
        self.start_time = datetime.now()

    def register_version(self, version: str, router: APIRouter):
        self.versions[version] = router
        self.router.include_router(router, prefix=f"/{version}")

    def get_stats(self) -> Dict[str, Any]:
        uptime = (datetime.now() - self.start_time).total_seconds()
        return {
            "versions": list(self.versions.keys()),
            "request_count": self.request_count,
            "uptime_seconds": uptime
        }

    def increment_request(self):
        self.request_count += 1

gateway = APIGateway()
