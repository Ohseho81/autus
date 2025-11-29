from abc import ABC, abstractmethod

class ConfigKernel(ABC):
    """환경변수, 설정 로딩·검증, 프로파일 관리"""
    @abstractmethod
    def load_config(self):
        pass

    @abstractmethod
    def validate_config(self):
        pass
