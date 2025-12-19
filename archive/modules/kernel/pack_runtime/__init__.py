from typing import Any, Dict, Callable

PackHandler = Callable[[Dict[str, Any]], Dict[str, Any]]
pack_handlers: Dict[str, PackHandler] = {}

def register_pack(pack_id: str, handler: PackHandler) -> None:
    pack_handlers[pack_id] = handler

def execute_pack(pack_id: str, payload: Dict[str, Any], cell_id: str = "default") -> Dict[str, Any]:
    handler = pack_handlers.get(pack_id)
    if handler is None:
        return {"status": "error", "reason": "pack_not_registered", "pack_id": pack_id}
    result = handler(payload)
    return {"status": "ok", "pack_id": pack_id, "cell_id": cell_id, "result": result}
