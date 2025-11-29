from abc import ABC, abstractmethod

class PluginLoader(ABC):
    """Pack/Connector 로딩, 버전·호환성 체크"""
    @abstractmethod
    def load_plugin(self, plugin_name):
        pass

    @abstractmethod
    def check_compatibility(self, plugin_name):
        pass
