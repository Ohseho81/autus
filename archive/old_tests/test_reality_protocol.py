"""
Tests for AUTUS Reality Protocol
protocols/reality/events.py
"""

import pytest
from datetime import datetime, timezone
from protocols.reality import RealityEvent, EventError, ValidationError
from protocols.reality.events import EventBatch, EventSource


class TestRealityEvent:
    """Tests for RealityEvent model."""
    
    def test_create_basic_event(self):
        """Test creating a basic reality event."""
        event = RealityEvent(
            id="evt_001",
            source="device",
            type="sensor.temperature"
        )
        
        assert event.id == "evt_001"
        assert event.source == "device"
        assert event.type == "sensor.temperature"
        assert event.payload == {}
        assert event.version == "1.0.0"
    
    def test_create_event_with_payload(self):
        """Test creating event with payload data."""
        event = RealityEvent(
            id="evt_002",
            source="user",
            type="user.login",
            actor_zero_id="Z_test123",
            payload={"ip": "192.168.1.1", "device": "mobile"}
        )
        
        assert event.actor_zero_id == "Z_test123"
        assert event.payload["ip"] == "192.168.1.1"
        assert event.payload["device"] == "mobile"
    
    def test_create_device_event(self):
        """Test creating a device sensor event."""
        event = RealityEvent(
            id="evt_003",
            source="device",
            type="sensor.motion",
            device_id="dev_001",
            city_id="seoul",
            location_id="building_a",
            payload={"detected": True, "confidence": 0.95}
        )
        
        assert event.device_id == "dev_001"
        assert event.city_id == "seoul"
        assert event.location_id == "building_a"
    
    def test_event_timestamp(self):
        """Test that events get automatic timestamps."""
        before = datetime.now(timezone.utc)
        event = RealityEvent(id="evt_004", source="system", type="health.check")
        after = datetime.now(timezone.utc)
        
        assert before <= event.created_at <= after
    
    def test_event_with_tags(self):
        """Test events with tags."""
        event = RealityEvent(
            id="evt_005",
            source="device",
            type="sensor.temperature",
            tags=["critical", "hvac", "building_a"]
        )
        
        assert "critical" in event.tags
        assert len(event.tags) == 3
    
    def test_all_source_types(self):
        """Test all valid source types."""
        sources = ["device", "user", "system", "pack", "external"]
        
        for source in sources:
            event = RealityEvent(id=f"evt_{source}", source=source, type="test")
            assert event.source == source
    
    def test_event_json_serialization(self):
        """Test event can be serialized to JSON."""
        event = RealityEvent(
            id="evt_json",
            source="device",
            type="test.event",
            payload={"value": 42}
        )
        
        json_data = event.model_dump_json()
        assert "evt_json" in json_data
        assert "device" in json_data


class TestEventBatch:
    """Tests for EventBatch model."""
    
    def test_create_batch(self):
        """Test creating a batch of events."""
        events = [
            RealityEvent(id="evt_1", source="device", type="test"),
            RealityEvent(id="evt_2", source="device", type="test"),
            RealityEvent(id="evt_3", source="device", type="test"),
        ]
        
        batch = EventBatch(events=events, batch_id="batch_001")
        
        assert len(batch.events) == 3
        assert batch.batch_id == "batch_001"


class TestEventErrors:
    """Tests for event error classes."""
    
    def test_event_error(self):
        """Test base EventError."""
        error = EventError("Something went wrong", event_id="evt_err")
        
        assert "Something went wrong" in str(error)
        assert error.event_id == "evt_err"
    
    def test_validation_error(self):
        """Test ValidationError."""
        error = ValidationError(
            message="Invalid value",
            field="payload.temperature",
            event_id="evt_val"
        )
        
        assert error.field == "payload.temperature"
        assert "Invalid value" in error.message
        assert error.event_id == "evt_val"


class TestEventSource:
    """Tests for EventSource enum."""
    
    def test_all_sources(self):
        """Test all defined sources."""
        assert EventSource.DEVICE.value == "device"
        assert EventSource.USER.value == "user"
        assert EventSource.SYSTEM.value == "system"
        assert EventSource.PACK.value == "pack"
        assert EventSource.EXTERNAL.value == "external"

