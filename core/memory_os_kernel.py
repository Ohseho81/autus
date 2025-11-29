from abc import ABC, abstractmethod

class MemoryOSKernel(ABC):
    """추상 메모리 인터페이스 (store/search/export/import)"""
    @abstractmethod
    def store(self, data):
        pass

    @abstractmethod
    def search(self, query):
        pass

    @abstractmethod
    def export(self):
        pass

    @abstractmethod
    def import_data(self, data):
        pass
