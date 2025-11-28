
import pytest
import importlib.util
sdk_spec = importlib.util.find_spec("sdk")
pytestmark = pytest.mark.skipif(sdk_spec is None, reason="sdk 모듈 없음. 환경 의존성으로 skip.")

if sdk_spec:
    from sdk.autus_sdk import AutusSDK
    import requests
    from unittest.mock import patch

@pytest.fixture
def sdk():
    if not sdk_spec:
        pytest.skip("sdk 모듈 없음. 환경 의존성으로 skip.")
    return AutusSDK(base_url="http://localhost:8000")

def test_get_risk_report(sdk):
    if not sdk_spec:
        pytest.skip("sdk 모듈 없음. 환경 의존성으로 skip.")
    with patch.object(requests, "get") as mock_get:
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {"risks": [{"id": "R1", "name": "Test", "severity": "HIGH"}]}
        result = sdk.get_risk_report()
        assert "risks" in result
        assert result["risks"][0]["id"] == "R1"

def test_trigger_workflow(sdk):
    if not sdk_spec:
        pytest.skip("sdk 모듈 없음. 환경 의존성으로 skip.")
    with patch.object(requests, "post") as mock_post:
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"status": "success"}
        result = sdk.trigger_workflow("wf1", {"param1": 123})
        assert result["status"] == "success"
