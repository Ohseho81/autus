from abc import ABC, abstractmethod

class CoreRuntimeKernel(ABC):
    """전체 런타임 초기화, 이벤트 루프 관리, DI/컨테이너"""
    @abstractmethod
    def initialize(self):
        pass

    @abstractmethod
    def run_event_loop(self):
        pass
