from abc import ABC, abstractmethod

class StandardLoopEngine(ABC):
    """PER / SPG / FACT / TRUST 루프 엔진 (루프 스케줄러)"""
    @abstractmethod
    def schedule_loops(self):
        pass
