"""
Simple plugin loader used only for tests.

For now we provide a minimal implementation that can load and execute
the Slack notifier demo plugin used in tests.
"""

from importlib import import_module
from typing import Any, Dict


class _StubRequests:
    """
    기본 테스트용 requests 스텁.

    실제 네트워크 호출은 하지 않고, tests에서 DummyRequests로 monkeypatch 해서
    호출 여부만 검증할 수 있도록 한다.
    """

    called = False

    @classmethod
    def post(cls, url, json=None, timeout: int = 10):
        cls.called = True

        class _Resp:
            status_code = 200
            text = "ok"

        return _Resp()


# tests/test_plugin_loader.py 에서 `plugins.loader.requests` 를 DummyRequests로
# monkeypatch 할 것을 기대한다. 기본값은 네트워크 없는 스텁으로 둔다.
requests: Any = _StubRequests()


def load_plugin(path: str) -> Any:
    """
    Load a plugin object from dotted path, e.g. 'packs.integration.slack_notifier:run'.
    """
    if ":" in path:
        module_name, attr = path.split(":", 1)
    else:
        module_name, attr = path, None

    module = import_module(module_name)
    return getattr(module, attr) if attr else module


def load_and_run(path: str, *args, **kwargs) -> Any:
    plugin = load_plugin(path)
    if callable(plugin):
        return plugin(*args, **kwargs)
    raise TypeError("Loaded plugin is not callable")


class SlackNotifier:
    """
    Simple wrapper object exposing `notify()` for tests.
    """

    def __init__(self, webhook_url: str):
        self.webhook_url = webhook_url

    def notify(self, message: str, payload: Dict[str, Any] | None = None) -> Any:
        payload = payload or {"text": message}
        # tests/test_plugin_loader.py 에서 loader.requests 를 DummyRequests 로
        # monkeypatch 하므로, 이 모듈의 requests.post 를 직접 호출한다.
        resp = requests.post(self.webhook_url, json=payload, timeout=10)
        return {
            "success": getattr(resp, "status_code", 200) == 200,
            "status_code": getattr(resp, "status_code", 200),
            "output": getattr(resp, "text", ""),
        }


def run_plugin(name: str, **kwargs: Dict[str, Any]) -> Any:
    """
    Convenience helper used in tests: currently supports `slack_notifier`.
    """
    if name == "slack_notifier":
        webhook_url = kwargs.get("webhook_url", "")
        return SlackNotifier(webhook_url)
    # Fallback: treat name as full dotted path
    return load_and_run(name, **kwargs)


