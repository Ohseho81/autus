from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

class PluginBase(ABC):
    name: str = "base_plugin"
    version: str = "1.0.0"
    enabled: bool = True
    
    @abstractmethod
    def initialize(self) -> None:
        pass
    
    @abstractmethod
    def execute(self, data: Dict[str, Any]) -> Dict[str, Any]:
        pass
    
    def shutdown(self) -> None:
        pass
    
    def get_info(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "version": self.version,
            "enabled": self.enabled
        }
