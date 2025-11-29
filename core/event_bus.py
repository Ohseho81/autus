from abc import ABC, abstractmethod

class EventBus(ABC):
    """Pack/Protocol 간 이벤트 라우팅, 비동기 큐"""
    @abstractmethod
    def publish(self, event):
        pass

    @abstractmethod
    def subscribe(self, event_type, handler):
        pass
