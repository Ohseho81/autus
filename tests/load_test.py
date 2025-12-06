"""
AUTUS Load Testing Suite using Locust

Simulates concurrent users and measures system performance under load.
Tests critical endpoints for response times and throughput.

Usage:
    locust -f tests/load_test.py --host=http://localhost:8003
"""

from locust import HttpUser, task, between
import random
from datetime import datetime, timedelta


class AUTUSUser(HttpUser):
    """Simulates an AUTUS user."""
    
    wait_time = between(1, 3)  # Wait 1-3 seconds between requests
    
    def on_start(self):
        """Initialize user session."""
        self.device_id = f"dev_{random.randint(1, 100):03d}"
        self.entity_id = f"talent-T{random.randint(1, 106):03d}"
    
    # ===== Devices Endpoints =====
    
    @task(5)
    def list_devices(self):
        """List all devices."""
        self.client.get("/devices/", name="GET /devices/")
    
    @task(3)
    def list_online_devices(self):
        """List online devices."""
        self.client.get("/devices/online", name="GET /devices/online")
    
    @task(2)
    def get_device_stats(self):
        """Get device statistics."""
        self.client.get("/devices/stats/summary", name="GET /devices/stats/summary")
    
    @task(1)
    def register_device(self):
        """Register a new device."""
        device = {
            "id": f"sensor-{random.randint(1000, 9999)}",
            "name": f"Sensor {random.randint(1, 50)}",
            "type": random.choice(["sensor", "actuator", "monitor"]),
            "status": random.choice(["active", "idle", "offline"])
        }
        self.client.post("/devices/register", json=device, name="POST /devices/register")
    
    # ===== Analytics Endpoints =====
    
    @task(8)
    def get_analytics_stats(self):
        """Get analytics statistics."""
        self.client.get("/analytics/stats", name="GET /analytics/stats")
    
    @task(5)
    def get_page_views(self):
        """Get page views analytics."""
        self.client.get("/analytics/pages", name="GET /analytics/pages")
    
    @task(5)
    def get_api_calls(self):
        """Get API calls analytics."""
        self.client.get("/analytics/api-calls", name="GET /analytics/api-calls")
    
    @task(4)
    def track_event(self):
        """Track an event."""
        event_type = random.choice(["click", "view", "submit", "hover"])
        self.client.post(
            f"/analytics/track?event=user_{event_type}",
            name="POST /analytics/track"
        )
    
    @task(2)
    def get_events(self):
        """Get events listing."""
        self.client.get("/analytics/events", name="GET /analytics/events")
    
    # ===== Twin Endpoints =====
    
    @task(3)
    def get_twin_overview(self):
        """Get digital twin overview."""
        self.client.get("/twin/overview", name="GET /twin/overview")
    
    # ===== God Mode Endpoints (less frequent) =====
    
    @task(1)
    def get_god_universe(self):
        """Get god mode universe overview."""
        self.client.get(
            "/god/universe?role=seho",
            name="GET /god/universe"
        )
    
    @task(1)
    def get_god_health(self):
        """Get system health from god mode."""
        self.client.get(
            "/god/health?role=seho",
            name="GET /god/health"
        )


class AdminUser(HttpUser):
    """Simulates an admin user with lower frequency."""
    
    wait_time = between(5, 10)  # Longer waits for admin
    
    @task(2)
    def get_god_graph(self):
        """Get god mode graph."""
        self.client.get("/god/graph?role=seho", name="GET /god/graph")
    
    @task(1)
    def get_god_universe(self):
        """Get god mode universe."""
        self.client.get("/god/universe?role=seho", name="GET /god/universe")
    
    @task(1)
    def get_analytics_overview(self):
        """Get analytics overview."""
        self.client.get("/analytics/stats", name="GET /analytics/stats (admin)")
