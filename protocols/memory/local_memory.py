"""
AUTUS Local Memory Protocol

Article II: Privacy by Architecture
- All personal data stored locally only
- No server transmission
- No PII in any database
"""

import yaml
import json
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime


class LocalMemory:
    """
    Local-only memory storage following AUTUS Constitution.
    
    Data never leaves the device. Format: .autus.memory.yaml
    """
    
    def __init__(self, memory_path: Optional[str] = None):
        if memory_path:
            self.memory_file = Path(memory_path)
        else:
            self.memory_file = Path.home() / ".autus.memory.yaml"
        self._ensure_file()
    
    def _ensure_file(self) -> None:
        """Create memory file if it doesn't exist."""
        if not self.memory_file.exists():
            self.memory_file.parent.mkdir(parents=True, exist_ok=True)
            self._save({
                "version": "1.0.0",
                "created_at": datetime.now().isoformat(),
                "preferences": {},
                "patterns": {},
                "workflows": [],
                "sovereign": {
                    "consent": [],
                    "data_policy": "local_only"
                }
            })
    
    def _load(self) -> Dict[str, Any]:
        """Load memory from local file."""
        with open(self.memory_file, 'r') as f:
            return yaml.safe_load(f) or {}
    
    def _save(self, data: Dict[str, Any]) -> None:
        """Save memory to local file."""
        data["updated_at"] = datetime.now().isoformat()
        with open(self.memory_file, 'w') as f:
            yaml.dump(data, f, default_flow_style=False, allow_unicode=True)
    
    def get_preference(self, key: str, default: Any = None) -> Any:
        """Get a user preference."""
        data = self._load()
        return data.get("preferences", {}).get(key, default)
    
    def set_preference(self, key: str, value: Any) -> None:
        """Set a user preference (stored locally only)."""
        data = self._load()
        if "preferences" not in data:
            data["preferences"] = {}
        data["preferences"][key] = value
        self._save(data)
    
    def get_pattern(self, pattern_name: str) -> Optional[Dict[str, Any]]:
        """Get a behavior pattern."""
        data = self._load()
        return data.get("patterns", {}).get(pattern_name)
    
    def set_pattern(self, pattern_name: str, pattern_data: Dict[str, Any]) -> None:
        """Set a behavior pattern."""
        data = self._load()
        if "patterns" not in data:
            data["patterns"] = {}
        data["patterns"][pattern_name] = {
            **pattern_data,
            "updated_at": datetime.now().isoformat()
        }
        self._save(data)
    
    def add_workflow(self, workflow: Dict[str, Any]) -> None:
        """Add a workflow to memory."""
        data = self._load()
        if "workflows" not in data:
            data["workflows"] = []
        workflow["added_at"] = datetime.now().isoformat()
        data["workflows"].append(workflow)
        self._save(data)
    
    def get_workflows(self) -> list:
        """Get all stored workflows."""
        data = self._load()
        return data.get("workflows", [])
    
    def get_sovereign_status(self) -> Dict[str, Any]:
        """Get sovereign/privacy status."""
        data = self._load()
        return data.get("sovereign", {"data_policy": "local_only"})
    
    def get_summary(self) -> Dict[str, Any]:
        """Get memory summary (for Twin API)."""
        data = self._load()
        return {
            "version": data.get("version", "1.0.0"),
            "preferences_count": len(data.get("preferences", {})),
            "patterns_count": len(data.get("patterns", {})),
            "workflows_count": len(data.get("workflows", [])),
            "sovereign": data.get("sovereign", {}),
            "updated_at": data.get("updated_at")
        }


if __name__ == "__main__":
    memory = LocalMemory("./test_memory.yaml")
    memory.set_preference("timezone", "Asia/Seoul")
    memory.set_preference("language", "ko")
    memory.set_pattern("work_hours", {
        "start": "09:00",
        "end": "18:00"
    })
    print("✅ Memory Protocol Demo")
    print(f"Summary: {memory.get_summary()}")
