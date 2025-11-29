from abc import ABC, abstractmethod

class DeviceBridgeCore(ABC):
    """다중 디바이스(웹/모바일/3D)와의 기본 브릿지"""
    @abstractmethod
    def connect_device(self, device_info):
        pass

    @abstractmethod
    def disconnect_device(self, device_id):
        pass
