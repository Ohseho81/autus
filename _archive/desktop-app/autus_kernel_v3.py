"""
AUTUS Kernel V3 — 90-Type Dictionary System
6-Bucket EdgePolicy Router with Real-time Visualization
"""

import sys
import random
import json
from PySide6.QtCore import QObject, Signal, Property, QTimer, Slot
from PySide6.QtGui import QGuiApplication
from PySide6.QtQml import QQmlApplicationEngine

# ═══════════════════════════════════════════════════════════════════════════════
# 90-TYPE CANONICAL DICTIONARY (Single Source of Truth)
# ═══════════════════════════════════════════════════════════════════════════════

AUTUS_90_TYPES = {
    # ─── BUCKET 1: STATE (15 types) ───
    "state.initial": {"policy": "NORMAL", "bucket": "state", "current": 100, "target": 100},
    "state.active": {"policy": "NORMAL", "bucket": "state", "current": 842, "target": 1000},
    "state.pending": {"policy": "ALTERNATE", "bucket": "state", "current": 156, "target": 500},
    "state.paused": {"policy": "LOOP", "bucket": "state", "current": 45, "target": 200},
    "state.completed": {"policy": "NORMAL", "bucket": "state", "current": 1200, "target": 1200},
    "state.failed": {"policy": "ALTERNATE", "bucket": "state", "current": 23, "target": 0},
    "state.cancelled": {"policy": "ALTERNATE", "bucket": "state", "current": 8, "target": 0},
    "state.archived": {"policy": "NORMAL", "bucket": "state", "current": 3400, "target": 5000},
    "state.draft": {"policy": "LOOP", "bucket": "state", "current": 67, "target": 100},
    "state.review": {"policy": "ALTERNATE", "bucket": "state", "current": 234, "target": 300},
    "state.approved": {"policy": "NORMAL", "bucket": "state", "current": 890, "target": 1000},
    "state.rejected": {"policy": "ALTERNATE", "bucket": "state", "current": 12, "target": 0},
    "state.escalated": {"policy": "ALTERNATE", "bucket": "state", "current": 34, "target": 50},
    "state.delegated": {"policy": "NORMAL", "bucket": "state", "current": 78, "target": 100},
    "state.locked": {"policy": "LOOP", "bucket": "state", "current": 5, "target": 10},

    # ─── BUCKET 2: SIGNAL (15 types) ───
    "signal.trigger": {"policy": "ALTERNATE", "bucket": "signal", "current": 456, "target": 800},
    "signal.alert": {"policy": "ALTERNATE", "bucket": "signal", "current": 89, "target": 100},
    "signal.warning": {"policy": "ALTERNATE", "bucket": "signal", "current": 234, "target": 300},
    "signal.info": {"policy": "NORMAL", "bucket": "signal", "current": 1200, "target": 2000},
    "signal.error": {"policy": "ALTERNATE", "bucket": "signal", "current": 45, "target": 0},
    "signal.success": {"policy": "NORMAL", "bucket": "signal", "current": 678, "target": 1000},
    "signal.timeout": {"policy": "ALTERNATE", "bucket": "signal", "current": 12, "target": 0},
    "signal.retry": {"policy": "LOOP", "bucket": "signal", "current": 34, "target": 50},
    "signal.callback": {"policy": "NORMAL", "bucket": "signal", "current": 567, "target": 800},
    "signal.webhook": {"policy": "NORMAL", "bucket": "signal", "current": 234, "target": 500},
    "signal.event": {"policy": "NORMAL", "bucket": "signal", "current": 890, "target": 1500},
    "signal.notification": {"policy": "NORMAL", "bucket": "signal", "current": 1456, "target": 2000},
    "signal.broadcast": {"policy": "NORMAL", "bucket": "signal", "current": 345, "target": 500},
    "signal.pulse": {"policy": "LOOP", "bucket": "signal", "current": 78, "target": 100},
    "signal.heartbeat": {"policy": "NORMAL", "bucket": "signal", "current": 9999, "target": 10000},

    # ─── BUCKET 3: DECISION (15 types) ───
    "decision.approve": {"policy": "NORMAL", "bucket": "decision", "current": 1842, "target": 2500},
    "decision.reject": {"policy": "ALTERNATE", "bucket": "decision", "current": 156, "target": 200},
    "decision.defer": {"policy": "LOOP", "bucket": "decision", "current": 89, "target": 150},
    "decision.escalate": {"policy": "ALTERNATE", "bucket": "decision", "current": 45, "target": 100},
    "decision.delegate": {"policy": "NORMAL", "bucket": "decision", "current": 234, "target": 400},
    "decision.override": {"policy": "ALTERNATE", "bucket": "decision", "current": 12, "target": 50},
    "decision.confirm": {"policy": "NORMAL", "bucket": "decision", "current": 567, "target": 800},
    "decision.cancel": {"policy": "ALTERNATE", "bucket": "decision", "current": 34, "target": 100},
    "decision.retry": {"policy": "LOOP", "bucket": "decision", "current": 78, "target": 200},
    "decision.split": {"policy": "ALTERNATE", "bucket": "decision", "current": 23, "target": 50},
    "decision.merge": {"policy": "NORMAL", "bucket": "decision", "current": 45, "target": 100},
    "decision.route": {"policy": "NORMAL", "bucket": "decision", "current": 890, "target": 1200},
    "decision.filter": {"policy": "NORMAL", "bucket": "decision", "current": 456, "target": 600},
    "decision.transform": {"policy": "NORMAL", "bucket": "decision", "current": 234, "target": 500},
    "decision.validate": {"policy": "ALTERNATE", "bucket": "decision", "current": 678, "target": 800},

    # ─── BUCKET 4: ACTION (15 types) ───
    "action.create": {"policy": "NORMAL", "bucket": "action", "current": 2345, "target": 3000},
    "action.read": {"policy": "NORMAL", "bucket": "action", "current": 8900, "target": 10000},
    "action.update": {"policy": "LOOP", "bucket": "action", "current": 1234, "target": 2000},
    "action.delete": {"policy": "ALTERNATE", "bucket": "action", "current": 156, "target": 500},
    "action.execute": {"policy": "NORMAL", "bucket": "action", "current": 567, "target": 800},
    "action.schedule": {"policy": "LOOP", "bucket": "action", "current": 234, "target": 400},
    "action.queue": {"policy": "LOOP", "bucket": "action", "current": 456, "target": 600},
    "action.process": {"policy": "NORMAL", "bucket": "action", "current": 890, "target": 1200},
    "action.send": {"policy": "NORMAL", "bucket": "action", "current": 3456, "target": 5000},
    "action.receive": {"policy": "NORMAL", "bucket": "action", "current": 3400, "target": 5000},
    "action.sync": {"policy": "LOOP", "bucket": "action", "current": 678, "target": 1000},
    "action.async": {"policy": "NORMAL", "bucket": "action", "current": 1234, "target": 2000},
    "action.batch": {"policy": "LOOP", "bucket": "action", "current": 89, "target": 200},
    "action.stream": {"policy": "NORMAL", "bucket": "action", "current": 456, "target": 800},
    "action.poll": {"policy": "LOOP", "bucket": "action", "current": 234, "target": 500},

    # ─── BUCKET 5: CONSTRAINT (15 types) ───
    "constraint.policy": {"policy": "ALTERNATE", "bucket": "constraint", "current": 45, "target": 50},
    "constraint.rule": {"policy": "ALTERNATE", "bucket": "constraint", "current": 89, "target": 100},
    "constraint.limit": {"policy": "ALTERNATE", "bucket": "constraint", "current": 234, "target": 300},
    "constraint.quota": {"policy": "ALTERNATE", "bucket": "constraint", "current": 78, "target": 100},
    "constraint.threshold": {"policy": "ALTERNATE", "bucket": "constraint", "current": 156, "target": 200},
    "constraint.boundary": {"policy": "ALTERNATE", "bucket": "constraint", "current": 34, "target": 50},
    "constraint.filter": {"policy": "ALTERNATE", "bucket": "constraint", "current": 567, "target": 600},
    "constraint.validation": {"policy": "ALTERNATE", "bucket": "constraint", "current": 890, "target": 1000},
    "constraint.authorization": {"policy": "ALTERNATE", "bucket": "constraint", "current": 234, "target": 300},
    "constraint.authentication": {"policy": "ALTERNATE", "bucket": "constraint", "current": 456, "target": 500},
    "constraint.encryption": {"policy": "ALTERNATE", "bucket": "constraint", "current": 678, "target": 800},
    "constraint.compliance": {"policy": "ALTERNATE", "bucket": "constraint", "current": 89, "target": 100},
    "constraint.audit": {"policy": "ALTERNATE", "bucket": "constraint", "current": 1234, "target": 1500},
    "constraint.governance": {"policy": "ALTERNATE", "bucket": "constraint", "current": 45, "target": 100},
    "constraint.sla": {"policy": "ALTERNATE", "bucket": "constraint", "current": 98, "target": 100},

    # ─── BUCKET 6: RECORD (15 types) ───
    "record.log": {"policy": "NORMAL", "bucket": "record", "current": 45000, "target": 50000},
    "record.audit": {"policy": "NORMAL", "bucket": "record", "current": 12345, "target": 15000},
    "record.trace": {"policy": "NORMAL", "bucket": "record", "current": 8900, "target": 10000},
    "record.metric": {"policy": "NORMAL", "bucket": "record", "current": 23456, "target": 30000},
    "record.event": {"policy": "NORMAL", "bucket": "record", "current": 5678, "target": 8000},
    "record.snapshot": {"policy": "LOOP", "bucket": "record", "current": 234, "target": 500},
    "record.backup": {"policy": "LOOP", "bucket": "record", "current": 89, "target": 100},
    "record.archive": {"policy": "NORMAL", "bucket": "record", "current": 3456, "target": 5000},
    "record.checkpoint": {"policy": "LOOP", "bucket": "record", "current": 456, "target": 600},
    "record.replay": {"policy": "LOOP", "bucket": "record", "current": 78, "target": 200},
    "record.history": {"policy": "NORMAL", "bucket": "record", "current": 6789, "target": 10000},
    "record.timeline": {"policy": "NORMAL", "bucket": "record", "current": 1234, "target": 2000},
    "record.ledger": {"policy": "NORMAL", "bucket": "record", "current": 890, "target": 1000},
    "record.journal": {"policy": "NORMAL", "bucket": "record", "current": 567, "target": 800},
    "record.manifest": {"policy": "NORMAL", "bucket": "record", "current": 234, "target": 500},
}

# Bucket-level policy defaults
BUCKET_POLICIES = {
    "state": "NORMAL",
    "signal": "ALTERNATE", 
    "decision": "MIXED",
    "action": "LOOP",
    "constraint": "ALTERNATE",
    "record": "NORMAL"
}


class AutusKernelV3(QObject):
    """
    AUTUS Kernel V3 — 90-Type Router Engine
    Provides real-time EdgePolicy routing and visualization data
    """
    dataChanged = Signal()
    typeSelected = Signal(str)
    
    def __init__(self):
        super().__init__()
        self._velocity = 74
        self._entropy = 0.32
        self._current_policy = "NORMAL"
        self._current_type = "decision.approve"
        self._current_bucket = "decision"
        self._current_value = 1842
        self._target_value = 2500
        self._types_dict = AUTUS_90_TYPES
        self._filtered_types = list(AUTUS_90_TYPES.keys())
        
        # Simulation timer
        self._timer = QTimer()
        self._timer.timeout.connect(self._simulate)
        self._timer.start(500)
    
    # ═══════════════════════════════════════════════════════════════════════════════
    # PROPERTIES
    # ═══════════════════════════════════════════════════════════════════════════════
    
    @Property(int, notify=dataChanged)
    def velocity(self):
        return self._velocity
    
    @Property(float, notify=dataChanged)
    def entropy(self):
        return self._entropy
    
    @Property(str, notify=dataChanged)
    def currentPolicy(self):
        return self._current_policy
    
    @Property(str, notify=dataChanged)
    def currentType(self):
        return self._current_type
    
    @Property(str, notify=dataChanged)
    def currentBucket(self):
        return self._current_bucket
    
    @Property(int, notify=dataChanged)
    def currentValue(self):
        return self._current_value
    
    @Property(int, notify=dataChanged)
    def targetValue(self):
        return self._target_value
    
    @Property(str, notify=dataChanged)
    def policyColor(self):
        colors = {
            "NORMAL": "#3498db",      # Blue
            "ALTERNATE": "#E82127",   # Red
            "LOOP": "#f1c40f",        # Yellow
            "MIXED": "#9b59b6"        # Purple
        }
        return colors.get(self._current_policy, "#3498db")
    
    @Property(str, notify=dataChanged)
    def policyStyle(self):
        return "dashed" if self._current_policy == "ALTERNATE" else "solid"
    
    @Property(str, notify=dataChanged)
    def typesJson(self):
        return json.dumps(self._filtered_types)
    
    @Property(int, notify=dataChanged)
    def typeCount(self):
        return len(self._filtered_types)
    
    # ═══════════════════════════════════════════════════════════════════════════════
    # SLOTS (QML callable methods)
    # ═══════════════════════════════════════════════════════════════════════════════
    
    @Slot(str)
    def selectType(self, type_slug: str):
        """Select a type and update routing policy"""
        if type_slug in self._types_dict:
            type_data = self._types_dict[type_slug]
            self._current_type = type_slug
            self._current_policy = type_data["policy"]
            self._current_bucket = type_data["bucket"]
            self._current_value = type_data["current"]
            self._target_value = type_data["target"]
            self.dataChanged.emit()
            self.typeSelected.emit(type_slug)
            print(f"[KERNEL] Selected: {type_slug} → Policy: {self._current_policy}")
    
    @Slot(str)
    def filterByBucket(self, bucket: str):
        """Filter types by bucket category"""
        bucket = bucket.lower()
        if bucket == "all":
            self._filtered_types = list(self._types_dict.keys())
        else:
            self._filtered_types = [
                k for k, v in self._types_dict.items() 
                if v["bucket"] == bucket
            ]
        self._current_bucket = bucket
        self.dataChanged.emit()
        print(f"[KERNEL] Filtered by bucket: {bucket} ({len(self._filtered_types)} types)")
    
    @Slot(str)
    def searchTypes(self, query: str):
        """Search types by name"""
        query = query.lower().strip()
        if not query:
            self._filtered_types = list(self._types_dict.keys())
        else:
            self._filtered_types = [
                k for k in self._types_dict.keys()
                if query in k.lower()
            ]
        self.dataChanged.emit()
        print(f"[KERNEL] Search: '{query}' → {len(self._filtered_types)} results")
    
    @Slot(result=str)
    def getAllTypesJson(self):
        """Return all 90 types as JSON"""
        return json.dumps(self._types_dict)
    
    @Slot(str, result=str)
    def getTypeData(self, type_slug: str):
        """Get data for a specific type"""
        if type_slug in self._types_dict:
            return json.dumps(self._types_dict[type_slug])
        return "{}"
    
    # ═══════════════════════════════════════════════════════════════════════════════
    # SIMULATION
    # ═══════════════════════════════════════════════════════════════════════════════
    
    def _simulate(self):
        """Simulate real-time data changes"""
        # Velocity simulation
        self._velocity = max(0, min(120, self._velocity + random.randint(-3, 5)))
        
        # Entropy based on velocity variance
        self._entropy = min(1.0, max(0.0, self._entropy + random.uniform(-0.05, 0.05)))
        
        # Update current value towards target
        if self._current_value < self._target_value:
            self._current_value = min(
                self._target_value, 
                self._current_value + random.randint(1, 10)
            )
        
        self.dataChanged.emit()


if __name__ == "__main__":
    app = QGuiApplication(sys.argv)
    app.setApplicationName("AUTUS Kernel V3")
    app.setOrganizationName("AUTUS")
    
    engine = QQmlApplicationEngine()
    
    # Create kernel instance
    kernel = AutusKernelV3()
    engine.rootContext().setContextProperty("kernel", kernel)
    
    # Load QML
    engine.load("autus_kernel_v3.qml")
    
    if not engine.rootObjects():
        print("Error: Failed to load QML")
        sys.exit(-1)
    
    print("=" * 60)
    print("AUTUS Kernel V3 — 90-Type Dictionary System")
    print(f"Loaded {len(AUTUS_90_TYPES)} types across 6 buckets")
    print("=" * 60)
    
    sys.exit(app.exec())


