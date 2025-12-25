"""
AUTUS Tesla UI Clone — V11 Premium Edition
PySide6 + QML + QtLocation 실시간 지도 연동

실행: python main.py
의존성: pip install PySide6
"""

import sys
import random
from pathlib import Path
from PySide6.QtGui import QGuiApplication, QFont
from PySide6.QtQml import QQmlApplicationEngine, qmlRegisterType
from PySide6.QtCore import QObject, Signal, Slot, Property, QTimer, QUrl


class VehicleState(QObject):
    """차량 상태를 관리하는 실시간 모델"""
    
    speedChanged = Signal()
    batteryChanged = Signal()
    temperatureChanged = Signal()
    gearChanged = Signal()
    powerChanged = Signal()
    odometerChanged = Signal()
    
    def __init__(self):
        super().__init__()
        self._speed = 0
        self._battery = 72
        self._temperature = 21
        self._gear = "P"
        self._power = 0  # kW (양수: 소비, 음수: 회생)
        self._odometer = 12847.3
        
        # 시뮬레이션 타이머
        self._sim_timer = QTimer()
        self._sim_timer.timeout.connect(self._simulate_driving)
        self._sim_timer.start(100)  # 100ms 간격
        
        self._target_speed = 0
        self._is_driving = False
    
    def _simulate_driving(self):
        """주행 시뮬레이션 — 부드러운 속도 변화"""
        if self._gear == "D":
            self._is_driving = True
            # 목표 속도로 부드럽게 가속/감속
            if abs(self._speed - self._target_speed) > 1:
                if self._speed < self._target_speed:
                    self._speed = min(self._speed + random.uniform(0.5, 2), self._target_speed)
                else:
                    self._speed = max(self._speed - random.uniform(0.3, 1.5), self._target_speed)
                self.speedChanged.emit()
            
            # 파워 계산 (가속 시 양수, 감속 시 음수 = 회생)
            if self._speed < self._target_speed:
                self._power = int(random.uniform(20, 150))  # 가속
            elif self._speed > self._target_speed:
                self._power = int(random.uniform(-50, -10))  # 회생
            else:
                self._power = int(random.uniform(5, 20))  # 정속
            self.powerChanged.emit()
            
            # 배터리 소모
            if random.random() < 0.1:  # 10% 확률로 배터리 감소
                self._battery = max(0, self._battery - 0.01)
                self.batteryChanged.emit()
            
            # 주행거리 증가
            self._odometer += self._speed / 36000  # km
            self.odometerChanged.emit()
            
            # 랜덤하게 목표 속도 변경 (신호등, 커브 등 시뮬레이션)
            if random.random() < 0.02:
                self._target_speed = random.choice([0, 30, 50, 60, 80, 100])
                
        elif self._gear == "R":
            self._speed = min(self._speed + 0.2, 20) if self._is_driving else 0
            self.speedChanged.emit()
        else:
            # P 또는 N: 정지
            if self._speed > 0:
                self._speed = max(0, self._speed - 2)
                self.speedChanged.emit()
            self._power = 0
            self.powerChanged.emit()
    
    @Property(int, notify=speedChanged)
    def speed(self):
        return int(self._speed)
    
    @Property(int, notify=batteryChanged)
    def battery(self):
        return int(self._battery)
    
    @Property(int, notify=temperatureChanged)
    def temperature(self):
        return self._temperature
    
    @Property(str, notify=gearChanged)
    def gear(self):
        return self._gear
    
    @Property(int, notify=powerChanged)
    def power(self):
        return self._power
    
    @Property(float, notify=odometerChanged)
    def odometer(self):
        return round(self._odometer, 1)
    
    @Slot(str)
    def setGear(self, gear):
        if gear in ["P", "R", "N", "D"] and self._gear != gear:
            self._gear = gear
            self.gearChanged.emit()
            
            if gear == "D":
                self._target_speed = random.choice([30, 50, 60])
            elif gear == "R":
                self._is_driving = True
            else:
                self._target_speed = 0
    
    @Slot(int)
    def adjustTemperature(self, delta):
        new_temp = self._temperature + delta
        if 16 <= new_temp <= 28:
            self._temperature = new_temp
            self.temperatureChanged.emit()
    
    @Slot()
    def startDriving(self):
        """주행 시작"""
        self.setGear("D")
    
    @Slot()
    def stopDriving(self):
        """주행 정지"""
        self.setGear("P")


class NavigationState(QObject):
    """네비게이션 상태 관리"""
    
    destinationChanged = Signal()
    etaChanged = Signal()
    distanceChanged = Signal()
    latitudeChanged = Signal()
    longitudeChanged = Signal()
    
    def __init__(self):
        super().__init__()
        self._destination = "Gangnam Station"
        self._eta = "15 min"
        self._distance = "12.3 km"
        # 서울 강남역 좌표
        self._latitude = 37.4979
        self._longitude = 127.0276
        
        # 위치 시뮬레이션 타이머
        self._nav_timer = QTimer()
        self._nav_timer.timeout.connect(self._simulate_navigation)
        self._nav_timer.start(2000)  # 2초마다
    
    def _simulate_navigation(self):
        """네비게이션 시뮬레이션"""
        # 미세하게 위치 이동
        self._latitude += random.uniform(-0.0005, 0.0005)
        self._longitude += random.uniform(-0.0005, 0.0005)
        self.latitudeChanged.emit()
        self.longitudeChanged.emit()
    
    @Property(str, notify=destinationChanged)
    def destination(self):
        return self._destination
    
    @Property(str, notify=etaChanged)
    def eta(self):
        return self._eta
    
    @Property(str, notify=distanceChanged)
    def distance(self):
        return self._distance
    
    @Property(float, notify=latitudeChanged)
    def latitude(self):
        return self._latitude
    
    @Property(float, notify=longitudeChanged)
    def longitude(self):
        return self._longitude
    
    @Slot(str)
    def setDestination(self, dest):
        self._destination = dest
        self.destinationChanged.emit()


class MediaState(QObject):
    """미디어 플레이어 상태"""
    
    titleChanged = Signal()
    artistChanged = Signal()
    albumChanged = Signal()
    progressChanged = Signal()
    durationChanged = Signal()
    isPlayingChanged = Signal()
    
    def __init__(self):
        super().__init__()
        self._title = "Bohemian Rhapsody"
        self._artist = "Queen"
        self._album = "A Night at the Opera"
        self._progress = 0.0  # 0.0 ~ 1.0
        self._duration = 354  # seconds
        self._is_playing = True
        
        # 재생 타이머
        self._play_timer = QTimer()
        self._play_timer.timeout.connect(self._update_progress)
        self._play_timer.start(1000)
    
    def _update_progress(self):
        if self._is_playing:
            self._progress = min(1.0, self._progress + (1.0 / self._duration))
            if self._progress >= 1.0:
                self._progress = 0.0  # 루프
            self.progressChanged.emit()
    
    @Property(str, notify=titleChanged)
    def title(self):
        return self._title
    
    @Property(str, notify=artistChanged)
    def artist(self):
        return self._artist
    
    @Property(str, notify=albumChanged)
    def album(self):
        return self._album
    
    @Property(float, notify=progressChanged)
    def progress(self):
        return self._progress
    
    @Property(int, notify=durationChanged)
    def duration(self):
        return self._duration
    
    @Property(bool, notify=isPlayingChanged)
    def isPlaying(self):
        return self._is_playing
    
    @Slot()
    def togglePlay(self):
        self._is_playing = not self._is_playing
        self.isPlayingChanged.emit()
    
    @Slot()
    def nextTrack(self):
        tracks = [
            ("Bohemian Rhapsody", "Queen", "A Night at the Opera", 354),
            ("Hotel California", "Eagles", "Hotel California", 391),
            ("Stairway to Heaven", "Led Zeppelin", "Led Zeppelin IV", 482),
            ("Comfortably Numb", "Pink Floyd", "The Wall", 382),
        ]
        current_idx = next((i for i, t in enumerate(tracks) if t[0] == self._title), 0)
        next_idx = (current_idx + 1) % len(tracks)
        
        self._title, self._artist, self._album, self._duration = tracks[next_idx]
        self._progress = 0.0
        self.titleChanged.emit()
        self.artistChanged.emit()
        self.albumChanged.emit()
        self.durationChanged.emit()
        self.progressChanged.emit()
    
    @Slot()
    def prevTrack(self):
        self._progress = 0.0
        self.progressChanged.emit()


if __name__ == "__main__":
    app = QGuiApplication(sys.argv)
    
    # 앱 메타데이터
    app.setApplicationName("AUTUS Tesla UI")
    app.setOrganizationName("AUTUS")
    app.setOrganizationDomain("autus-ai.com")
    
    # QML 엔진 생성
    engine = QQmlApplicationEngine()
    
    # 모델 인스턴스 생성 및 등록
    vehicle_state = VehicleState()
    nav_state = NavigationState()
    media_state = MediaState()
    
    engine.rootContext().setContextProperty("vehicleState", vehicle_state)
    engine.rootContext().setContextProperty("navState", nav_state)
    engine.rootContext().setContextProperty("mediaState", media_state)
    
    # QML 파일 로드
    qml_file = Path(__file__).parent / "main.qml"
    engine.load(str(qml_file))

    if not engine.rootObjects():
        print("Error: Failed to load QML file")
        sys.exit(-1)
    
    sys.exit(app.exec())
