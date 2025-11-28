import importlib
import json
import os

PLUGINS_DIR = os.path.dirname(__file__)

class PluginSandboxError(Exception):
    pass

def load_plugin_metadata(plugin_name):
    meta_path = os.path.join(PLUGINS_DIR, f"{plugin_name}.json")
    with open(meta_path, encoding="utf-8") as f:
        return json.load(f)

def load_plugin(plugin_name):
    meta = load_plugin_metadata(plugin_name)
    module = importlib.import_module(f"plugins.{plugin_name}")
    entrypoint = getattr(module, meta["entrypoint"])
    return entrypoint

def run_plugin(plugin_name, *args, **kwargs):
    PluginClass = load_plugin(plugin_name)
    # 샌드박스: 네트워크/파일 접근 제한은 실제 환경에서는 별도 프로세스/컨테이너로 실행 필요
    # 여기서는 샘플로 직접 실행
    instance = PluginClass(*args, **kwargs)
    return instance
