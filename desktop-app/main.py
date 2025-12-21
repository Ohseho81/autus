"""
AUTUS Tesla UI Clone — PySide6 + QML
테슬라 V11 UI의 3단 레이어 구조를 재현한 데스크탑 애플리케이션

실행: python main.py
의존성: pip install PySide6
"""

import sys
from pathlib import Path
from PySide6.QtGui import QGuiApplication, QFontDatabase
from PySide6.QtQml import QQmlApplicationEngine
from PySide6.QtCore import QObject, Signal, Slot, Property

class VehicleState(QObject):
    """차량 상태를 관리하는 모델 클래스"""
    
    speedChanged = Signal()
    batteryChanged = Signal()
    temperatureChanged = Signal()
    gearChanged = Signal()
    
    def __init__(self):
        super().__init__()
        self._speed = 88
        self._battery = 72
        self._temperature = 21
        self._gear = "D"
    
    @Property(int, notify=speedChanged)
    def speed(self):
        return self._speed
    
    @speed.setter
    def speed(self, value):
        if self._speed != value:
            self._speed = value
            self.speedChanged.emit()
    
    @Property(int, notify=batteryChanged)
    def battery(self):
        return self._battery
    
    @battery.setter
    def battery(self, value):
        if self._battery != value:
            self._battery = value
            self.batteryChanged.emit()
    
    @Property(int, notify=temperatureChanged)
    def temperature(self):
        return self._temperature
    
    @temperature.setter
    def temperature(self, value):
        if self._temperature != value:
            self._temperature = value
            self.temperatureChanged.emit()
    
    @Property(str, notify=gearChanged)
    def gear(self):
        return self._gear
    
    @gear.setter
    def gear(self, value):
        if self._gear != value:
            self._gear = value
            self.gearChanged.emit()
    
    @Slot(int)
    def setSpeed(self, value):
        self.speed = value
    
    @Slot(int)
    def setBattery(self, value):
        self.battery = value
    
    @Slot(int)
    def adjustTemperature(self, delta):
        self.temperature = max(16, min(28, self._temperature + delta))
    
    @Slot(str)
    def setGear(self, gear):
        if gear in ["P", "R", "N", "D"]:
            self.gear = gear


class NavigationState(QObject):
    """네비게이션 상태를 관리하는 모델 클래스"""
    
    destinationChanged = Signal()
    etaChanged = Signal()
    distanceChanged = Signal()
    
    def __init__(self):
        super().__init__()
        self._destination = "Beach Street"
        self._eta = "15 min"
        self._distance = "12.3 km"
    
    @Property(str, notify=destinationChanged)
    def destination(self):
        return self._destination
    
    @Property(str, notify=etaChanged)
    def eta(self):
        return self._eta
    
    @Property(str, notify=distanceChanged)
    def distance(self):
        return self._distance


if __name__ == "__main__":
    app = QGuiApplication(sys.argv)
    
    # 앱 메타데이터 설정
    app.setApplicationName("AUTUS Tesla UI")
    app.setOrganizationName("AUTUS")
    app.setOrganizationDomain("autus-ai.com")
    
    # QML 엔진 생성
    engine = QQmlApplicationEngine()
    
    # 컨텍스트에 모델 등록
    vehicle_state = VehicleState()
    nav_state = NavigationState()
    
    engine.rootContext().setContextProperty("vehicleState", vehicle_state)
    engine.rootContext().setContextProperty("navState", nav_state)
    
    # QML 파일 로드
    qml_file = Path(__file__).parent / "main.qml"
    engine.load(str(qml_file))

    if not engine.rootObjects():
        print("Error: Failed to load QML file")
        sys.exit(-1)
    
    sys.exit(app.exec())
