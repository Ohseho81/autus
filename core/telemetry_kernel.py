from abc import ABC, abstractmethod

class TelemetryKernel(ABC):
    """로깅·메트릭·트레이싱 표준 (Pack/Protocol 공통 포맷)"""
    @abstractmethod
    def log(self, message):
        pass

    @abstractmethod
    def record_metric(self, name, value):
        pass

    @abstractmethod
    def trace(self, trace_info):
        pass
