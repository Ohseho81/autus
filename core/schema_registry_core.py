from abc import ABC, abstractmethod

class SchemaRegistryCore(ABC):
    """Pack/Protocol/Workflow 스키마 버전 관리"""
    @abstractmethod
    def register_schema(self, schema):
        pass

    @abstractmethod
    def get_schema(self, schema_id):
        pass
