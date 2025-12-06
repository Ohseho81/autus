import httpx
from typing import Optional, Dict, Any

class AUTUS:
    def __init__(self, base_url: str = "https://autus-production.up.railway.app"):
        self.base_url = base_url
        self.client = httpx.Client(timeout=30)

    def health(self) -> dict:
        response = self.client.get(f"{self.base_url}/health")
        return response.json()

    def get_universe(self) -> dict:
        response = self.client.get(f"{self.base_url}/universe/overview")
        return response.json()

    def get_twin(self, zero_id: str) -> dict:
        response = self.client.get(f"{self.base_url}/twin/user/{zero_id}")
        return response.json()

    def get_city(self, city_id: str) -> dict:
        response = self.client.get(f"{self.base_url}/twin/city/{city_id}")
        return response.json()

    def register_device(self, device_id: str, name: str, device_type: str) -> dict:
        data = {"id": device_id, "name": name, "type": device_type}
        response = self.client.post(f"{self.base_url}/devices/register", json=data)
        return response.json()

    def send_device_data(self, device_id: str, data: dict) -> dict:
        response = self.client.post(f"{self.base_url}/devices/{device_id}/data", json=data)
        return response.json()

    def get_analytics(self) -> dict:
        response = self.client.get(f"{self.base_url}/analytics/stats")
        return response.json()

    def track_event(self, event: str, data: Optional[dict] = None) -> dict:
        response = self.client.post(f"{self.base_url}/analytics/track?event={event}", json=data or {})
        return response.json()

    def close(self):
        self.client.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()
