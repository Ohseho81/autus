import asyncio
from typing import Dict, Any
from workers.base_worker import BaseWorker
from pathlib import Path
import shutil
from datetime import datetime

class BackupWorker(BaseWorker):
    name = "backup_worker"
    interval = 3600  # 1시간마다

    async def execute(self) -> Dict[str, Any]:
        backup_dir = Path("backups")
        backup_dir.mkdir(exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = backup_dir / f"auto_{timestamp}"
        
        files_backed = 0
        
        # DB 백업
        if Path("autus.db").exists():
            backup_path.mkdir(exist_ok=True)
            shutil.copy("autus.db", backup_path / "autus.db")
            files_backed += 1
        
        return {"backup": str(backup_path), "files": files_backed, "status": "ok"}

backup_worker = BackupWorker()
