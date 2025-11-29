from abc import ABC, abstractmethod

class ZeroIdentityGuard(ABC):
    """신원 정보 저장 금지 강제, PII 필터"""
    @abstractmethod
    def enforce_no_identity(self, data):
        pass

    @abstractmethod
    def filter_pii(self, data):
        pass
