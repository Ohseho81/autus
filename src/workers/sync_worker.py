import asyncio
from typing import Dict, Any
from workers.base_worker import BaseWorker

class SyncWorker(BaseWorker):
    name = "sync_worker"
    interval = 60

    async def execute(self) -> Dict[str, Any]:
        # 실시간 동기화 로직
        synced = 0
        # WebSocket 클라이언트에 업데이트 푸시
        return {"synced": synced, "status": "ok"}

sync_worker = SyncWorker()
