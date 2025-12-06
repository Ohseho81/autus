"""Local Memory Module - AUTUS Privacy-First Memory Protocol"""
from typing import Dict, Any, Optional
from datetime import datetime
from pathlib import Path
import yaml

class LocalMemory:
    def __init__(self, file_path: Optional[str] = None):
        self.file_path = Path(file_path) if file_path else None
        self.data: Dict[str, Any] = {}
        self.preferences: Dict[str, Any] = {}
        self.created_at = datetime.now().isoformat()
        if self.file_path and self.file_path.exists():
            self._load()
    
    def _load(self) -> None:
        if self.file_path:
            with open(self.file_path) as f:
                loaded = yaml.safe_load(f) or {}
                self.data = loaded.get("data", {})
                self.preferences = loaded.get("preferences", {})
    
    def _save(self) -> None:
        if self.file_path:
            self.file_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.file_path, 'w') as f:
                yaml.dump({"data": self.data, "preferences": self.preferences}, f)
    
    def get_summary(self) -> Dict[str, Any]:
        return {
            "version": "1.0.0",
            "total_items": len(self.data),
            "created_at": self.created_at,
            "keys": list(self.data.keys())
        }
    
    def set(self, key: str, value: Any) -> None:
        self.data[key] = value
        self._save()
    
    def get(self, key: str, default: Any = None) -> Any:
        return self.data.get(key, default)
    
    def set_preference(self, key: str, value: Any) -> None:
        self.preferences[key] = value
        self._save()
    
    def get_preference(self, key: str, default: Any = None) -> Any:
        return self.preferences.get(key, default)
    
    def delete(self, key: str) -> bool:
        if key in self.data:
            del self.data[key]
            self._save()
            return True
        return False
    
    def clear(self) -> None:
        self.data.clear()
        self.preferences.clear()
        self._save()
    
    def list_all(self) -> Dict[str, Any]:
        return self.data.copy()
