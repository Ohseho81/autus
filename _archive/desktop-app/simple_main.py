"""
AUTUS Tesla Dashboard UI
Absorbed from Tesla-Dashboard-UI-3
1920x1200 Full Layout with projectData integration
"""

import sys
import random
from PySide6.QtGui import QGuiApplication
from PySide6.QtQml import QQmlApplicationEngine
from PySide6.QtCore import QTimer, QObject, Signal, Property

class ProjectData(QObject):
    """Project data model for QML binding"""
    updated = Signal()
    
    def __init__(self):
        super().__init__()
        self._progress = 72.0  # Battery/progress percentage
        self._speed = 0        # Current speed km/h
        self._target_speed = 0
        self._is_driving = False
    
    @Property(float, notify=updated)
    def progress(self): 
        return self._progress

    @Property(int, notify=updated)
    def speed(self): 
        return int(self._speed)

    def update_stats(self):
        """Simulate driving with realistic speed changes"""
        # Random target speed changes (simulating traffic conditions)
        if random.random() < 0.05:
            self._target_speed = random.choice([0, 30, 50, 60, 80, 100, 120])
        
        # Smooth acceleration/deceleration
        if abs(self._speed - self._target_speed) > 1:
            if self._speed < self._target_speed:
                self._speed = min(self._speed + random.uniform(0.5, 3), self._target_speed)
            else:
                self._speed = max(self._speed - random.uniform(0.3, 2), self._target_speed)
        else:
            # Small fluctuations when at target speed
            self._speed = max(0, self._speed + random.uniform(-1, 1))
        
        # Battery drain simulation
        if self._speed > 0 and random.random() < 0.02:
            self._progress = max(0, self._progress - 0.1)
        
        self.updated.emit()
    
    def start_driving(self):
        """Start driving simulation"""
        self._is_driving = True
        self._target_speed = random.choice([50, 60, 80])
    
    def stop_driving(self):
        """Stop driving simulation"""
        self._is_driving = False
        self._target_speed = 0


if __name__ == "__main__":
    app = QGuiApplication(sys.argv)
    
    # App metadata
    app.setApplicationName("AUTUS Tesla Dashboard")
    app.setOrganizationName("AUTUS")
    
    engine = QQmlApplicationEngine()
    
    # Create and register data model
    data = ProjectData()
    engine.rootContext().setContextProperty("projectData", data)
    
    # Start simulation timer (100ms for smooth animation)
    timer = QTimer()
    timer.timeout.connect(data.update_stats)
    timer.start(100)
    
    # Start driving by default
    data.start_driving()

    # Load QML
    engine.load("simple_main.qml")
    
    if not engine.rootObjects():
        print("Error: Failed to load QML file")
        sys.exit(-1)
    
    sys.exit(app.exec())


