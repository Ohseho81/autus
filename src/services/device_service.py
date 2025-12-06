from typing import Dict, List, Optional, Any
from datetime import datetime

class DeviceService:
    def __init__(self):
        self.devices: Dict[str, Dict[str, Any]] = {}

    def register(self, device_id: str, name: str, device_type: str) -> Dict[str, Any]:
        self.devices[device_id] = {
            "id": device_id,
            "name": name,
            "type": device_type,
            "status": "online",
            "last_seen": datetime.now().isoformat(),
            "data": {}
        }
        return self.devices[device_id]

    def update_data(self, device_id: str, data: Dict[str, Any]) -> bool:
        if device_id in self.devices:
            self.devices[device_id]["data"] = data
            self.devices[device_id]["last_seen"] = datetime.now().isoformat()
            self.devices[device_id]["status"] = "online"
            return True
        return False

    def get_device(self, device_id: str) -> Optional[Dict[str, Any]]:
        return self.devices.get(device_id)

    def list_all(self) -> List[Dict[str, Any]]:
        return list(self.devices.values())

    def list_online(self) -> List[Dict[str, Any]]:
        return [d for d in self.devices.values() if d["status"] == "online"]

    def delete(self, device_id: str) -> bool:
        if device_id in self.devices:
            del self.devices[device_id]
            return True
        return False

    def get_stats(self) -> Dict[str, Any]:
        total = len(self.devices)
        online = len([d for d in self.devices.values() if d["status"] == "online"])
        return {"total": total, "online": online, "offline": total - online}

device_service = DeviceService()
