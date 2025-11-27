import pytest
from sdk.autus_sdk import AutusSDK
import requests
from unittest.mock import patch

@pytest.fixture
def sdk():
    return AutusSDK(base_url="http://localhost:8000")

def test_get_risk_report(sdk):
    with patch.object(requests, "get") as mock_get:
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {"risks": [{"id": "R1", "name": "Test", "severity": "HIGH"}]}
        result = sdk.get_risk_report()
        assert "risks" in result
        assert result["risks"][0]["id"] == "R1"

def test_trigger_workflow(sdk):
    with patch.object(requests, "post") as mock_post:
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"status": "success"}
        result = sdk.trigger_workflow("wf1", {"param1": 123})
        assert result["status"] == "success"
