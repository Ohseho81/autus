"""
Simple plugin loader used only for tests.

For now we provide a minimal implementation that can load and execute
the Slack notifier demo plugin used in tests.
"""

from importlib import import_module
from typing import Any, Dict


class _NoopRequests:
    """
    Default stand-in for the `requests` interface used in tests.
    """

    called = False

    @classmethod
    def post(cls, url, json=None, timeout: int = 10):
        cls.called = True

        class _Resp:
            status_code = 200
            text = "ok"

        return _Resp()


# Tests may monkeypatch this symbol to a DummyRequests implementation.
requests: Any = _NoopRequests()


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
        # Delegate to SlackAdapter so tests can monkeypatch its `requests` dependency.
        adapter_cls = load_plugin("packs.integration.slack_adapter:SlackAdapter")
        adapter = adapter_cls()
        return adapter.run(
            "notify",
            {"webhook_url": self.webhook_url, "payload": payload},
        )


def run_plugin(name: str, **kwargs: Dict[str, Any]) -> Any:
    """
    Convenience helper used in tests: currently supports `slack_notifier`.
    """
    if name == "slack_notifier":
        webhook_url = kwargs.get("webhook_url", "")
        return SlackNotifier(webhook_url)
    # Fallback: treat name as full dotted path
    return load_and_run(name, **kwargs)


