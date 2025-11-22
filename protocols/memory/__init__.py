"""AUTUS Memory Protocol - Full Version"""
import yaml
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional

class MemoryProtocol:
    """100% Local Memory OS"""
    
    def __init__(self, memory_path: Optional[Path] = None):
        if memory_path is None:
            memory_path = Path.home() / ".autus" / ".autus.memory.yaml"
        self.memory_path = memory_path
        self.data = self._load_or_create()
    
    def _load_or_create(self) -> Dict[str, Any]:
        if self.memory_path.exists():
            with open(self.memory_path, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f) or {}
        return self._create_default()
    
    def _create_default(self) -> Dict[str, Any]:
        return {
            "version": "1.0.0",
            "created_at": datetime.now().isoformat(),
            "preferences": {"timezone": "UTC", "language": "en"},
            "patterns": {},
            "workflow_history": [],
            "pack_usage": {}
        }
    
    def save(self):
        self.memory_path.parent.mkdir(parents=True, exist_ok=True)
        self.data["updated_at"] = datetime.now().isoformat()
        with open(self.memory_path, 'w', encoding='utf-8') as f:
            yaml.dump(self.data, f, allow_unicode=True)
    
    def set_preference(self, key: str, value: Any):
        if "preferences" not in self.data:
            self.data["preferences"] = {}
        self.data["preferences"][key] = value
        self.save()
    
    def get_preference(self, key: str, default=None):
        return self.data.get("preferences", {}).get(key, default)
    
    def add_workflow(self, name: str, status: str):
        if "workflow_history" not in self.data:
            self.data["workflow_history"] = []
        self.data["workflow_history"].append({
            "name": name,
            "status": status,
            "timestamp": datetime.now().isoformat()
        })
        self.save()
    
    def record_pack_usage(self, pack_name: str):
        if "pack_usage" not in self.data:
            self.data["pack_usage"] = {}
        if pack_name not in self.data["pack_usage"]:
            self.data["pack_usage"][pack_name] = 0
        self.data["pack_usage"][pack_name] += 1
        self.save()

if __name__ == "__main__":
    m = MemoryProtocol()
    m.set_preference("timezone", "Asia/Seoul")
    m.set_preference("language", "ko")
    m.add_workflow("test_workflow", "success")
    m.record_pack_usage("architect_pack")
    print(f"✅ Memory saved to: {m.memory_path}")
    print(f"   Preferences: {m.data['preferences']}")
    print(f"   Workflows: {len(m.data['workflow_history'])}")
    print(f"   Pack usage: {m.data['pack_usage']}")
