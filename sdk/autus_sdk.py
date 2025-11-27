import requests

class AutusSDK:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')

    def get_risk_report(self):
        resp = requests.get(f"{self.base_url}/api/risk/report")
        resp.raise_for_status()
        return resp.json()

    def trigger_workflow(self, workflow_id: str, params: dict):
        resp = requests.post(f"{self.base_url}/api/workflow/trigger", json={"workflow_id": workflow_id, "params": params})
        resp.raise_for_status()
        return resp.json()
