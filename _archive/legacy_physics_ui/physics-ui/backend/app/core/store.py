"""
InMemory Event Store + Snapshot
- append_event: 이벤트 저장
- get_events: 이벤트 조회
- save_snapshot: 상태 스냅샷 저장
- load_snapshot: 스냅샷 로드
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
import json
import os

SNAPSHOT_FILE = "autus_snapshot.json"
EVENTS_FILE = "autus_events.json"


@dataclass
class EventRecord:
    type: str
    payload: dict
    ts: str


@dataclass
class Store:
    events: list[EventRecord] = field(default_factory=list)
    snapshot: dict = field(default_factory=dict)

    def append_event(self, event_type: str, payload: dict) -> None:
        ts = datetime.now(timezone.utc).isoformat()
        self.events.append(EventRecord(type=event_type, payload=payload, ts=ts))
        self._persist_events()

    def get_events(self) -> list[dict]:
        return [
            {"type": e.type, "payload": e.payload, "ts": e.ts}
            for e in self.events
        ]

    def save_snapshot(self, state_dict: dict) -> None:
        self.snapshot = state_dict
        self._persist_snapshot()

    def load_snapshot(self) -> dict:
        return self.snapshot

    def _persist_events(self) -> None:
        try:
            with open(EVENTS_FILE, "w") as f:
                json.dump(self.get_events(), f)
        except Exception:
            pass

    def _persist_snapshot(self) -> None:
        try:
            with open(SNAPSHOT_FILE, "w") as f:
                json.dump(self.snapshot, f)
        except Exception:
            pass

    def restore_from_disk(self) -> None:
        # Load snapshot
        if os.path.exists(SNAPSHOT_FILE):
            try:
                with open(SNAPSHOT_FILE, "r") as f:
                    self.snapshot = json.load(f)
            except Exception:
                self.snapshot = {}
        
        # Load events
        if os.path.exists(EVENTS_FILE):
            try:
                with open(EVENTS_FILE, "r") as f:
                    events_data = json.load(f)
                    self.events = [
                        EventRecord(type=e["type"], payload=e["payload"], ts=e["ts"])
                        for e in events_data
                    ]
            except Exception:
                self.events = []


STORE = Store()
