import asyncio
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from datetime import datetime

class BaseWorker(ABC):
    name: str = "base_worker"
    interval: int = 60
    running: bool = False

    @abstractmethod
    async def execute(self) -> Dict[str, Any]:
        pass

    async def start(self):
        self.running = True
        while self.running:
            try:
                result = await self.execute()
                print(f"[{datetime.now()}] {self.name}: {result}")
            except Exception as e:
                print(f"[{datetime.now()}] {self.name} error: {e}")
            await asyncio.sleep(self.interval)

    def stop(self):
        self.running = False

    def get_status(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "interval": self.interval,
            "running": self.running
        }
