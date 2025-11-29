from abc import ABC, abstractmethod

class SecurityKernel(ABC):
    """헌법(Zero Identity, PII 금지) 강제, 리스크 감지·차단"""
    @abstractmethod
    def enforce_constitution(self):
        pass

    @abstractmethod
    def detect_risk(self):
        pass
