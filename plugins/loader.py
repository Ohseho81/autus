import os
import importlib
from pathlib import Path
from typing import Dict, List, Any
from plugins.base import PluginBase

class PluginLoader:
    def __init__(self, plugin_dir: str = "plugins/installed"):
        self.plugin_dir = Path(plugin_dir)
        self.plugins: Dict[str, PluginBase] = {}

    def discover(self) -> List[str]:
        discovered = []
        if self.plugin_dir.exists():
            for f in self.plugin_dir.glob("*.py"):
                if not f.name.startswith("_"):
                    discovered.append(f.stem)
        return discovered

    def load(self, plugin_name: str) -> bool:
        try:
            module = importlib.import_module(f"plugins.installed.{plugin_name}")
            if hasattr(module, "Plugin"):
                plugin = module.Plugin()
                plugin.initialize()
                self.plugins[plugin_name] = plugin
                return True
        except Exception as e:
            print(f"Failed to load {plugin_name}: {e}")
        return False

    def load_all(self) -> int:
        count = 0
        for name in self.discover():
            if self.load(name):
                count += 1
        return count

    def execute(self, plugin_name: str, data: Dict[str, Any]) -> Dict[str, Any]:
        if plugin_name in self.plugins:
            return self.plugins[plugin_name].execute(data)
        return {"error": "Plugin not found"}

    def list_plugins(self) -> List[Dict[str, Any]]:
        return [p.get_info() for p in self.plugins.values()]

    def unload(self, plugin_name: str) -> bool:
        if plugin_name in self.plugins:
            self.plugins[plugin_name].shutdown()
            del self.plugins[plugin_name]
            return True
        return False

plugin_loader = PluginLoader()
