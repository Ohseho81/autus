from typing import Any, Dict
from protocols.identity.visualizer import Identity3DGenerator, generate_demo_data

def run(payload: Dict[str, Any]) -> Dict[str, Any]:
    action = payload.get("action", "demo")
    if action == "demo": return {"status": "ok", "data": generate_demo_data()}
    elif action == "generate": return {"status": "ok", "data": Identity3DGenerator().get_full_3d_data()}
    return {"status": "ok", "action": action}
