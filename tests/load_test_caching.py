"""
Locust-based load test for AUTUS v4.5 caching performance validation
Compares response times with and without caching
"""

from locust import HttpUser, task, between
import random
from typing import List
import json

class CachingUser(HttpUser):
    """Simulates users accessing the AUTUS API"""
    
    wait_time = between(0.5, 2)  # Random wait between requests
    
    def on_start(self):
        """Initialize user"""
        self.endpoint_names = [
            "analytics_stats",
            "analytics_pages", 
            "devices_list",
            "devices_online"
        ]
    
    @task(3)
    def test_analytics_stats(self):
        """Test cached analytics stats endpoint"""
        self.client.get("/analytics/stats", name="/analytics/stats")
    
    @task(2)
    def test_analytics_pages(self):
        """Test cached analytics pages endpoint"""
        self.client.get("/analytics/pages", name="/analytics/pages")
    
    @task(3)
    def test_devices_list(self):
        """Test cached devices list endpoint"""
        self.client.get("/devices/list", name="/devices/list")
    
    @task(2)
    def test_devices_online(self):
        """Test cached online devices endpoint (shortest TTL)"""
        self.client.get("/devices/online", name="/devices/online")
    
    @task(1)
    def check_cache_stats(self):
        """Occasionally check cache statistics"""
        self.client.get("/cache/stats", name="/cache/stats")
    
    @task(1)
    def test_cache_invalidation(self):
        """Simulate cache invalidation with POST request"""
        self.client.post("/analytics/track", 
                        json={"event": "test_event", "timestamp": "2024-01-01T00:00:00Z"},
                        name="/analytics/track")
