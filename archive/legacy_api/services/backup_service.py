import json
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

class BackupService:
    def __init__(self, backup_dir: str = "backups"):
        self.backup_dir = Path(backup_dir)
        self.backup_dir.mkdir(exist_ok=True)

    def create(self, name: Optional[str] = None) -> Dict[str, Any]:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = name or f"backup_{timestamp}"
        backup_path = self.backup_dir / backup_name
        backup_path.mkdir(exist_ok=True)

        files = []
        for src in ["autus.db", "specs", "evolved", "logs"]:
            if Path(src).exists():
                if Path(src).is_file():
                    shutil.copy(src, backup_path / src)
                else:
                    shutil.copytree(src, backup_path / src, dirs_exist_ok=True)
                files.append(src)

        metadata = {"name": backup_name, "timestamp": timestamp, "files": files}
        with open(backup_path / "metadata.json", "w") as f:
            json.dump(metadata, f, indent=2)

        return {"status": "created", "backup": backup_name, "files": files}

    def list_all(self) -> List[Dict[str, Any]]:
        backups = []
        for path in self.backup_dir.iterdir():
            if path.is_dir():
                meta = path / "metadata.json"
                if meta.exists():
                    with open(meta) as f:
                        backups.append(json.load(f))
        return sorted(backups, key=lambda x: x.get("timestamp", ""), reverse=True)

    def restore(self, name: str) -> Dict[str, Any]:
        backup_path = self.backup_dir / name
        if not backup_path.exists():
            return {"status": "error", "message": "Not found"}
        
        restored = []
        if (backup_path / "autus.db").exists():
            shutil.copy(backup_path / "autus.db", "autus.db")
            restored.append("autus.db")
        
        return {"status": "restored", "files": restored}

    def delete(self, name: str) -> Dict[str, Any]:
        backup_path = self.backup_dir / name
        if backup_path.exists():
            shutil.rmtree(backup_path)
            return {"status": "deleted"}
        return {"status": "error", "message": "Not found"}

backup_service = BackupService()
