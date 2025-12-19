import threading
from kernel.stabilization import execute_stabilization

def show_collapse_ui(state, timeout=10):
    executed = {"done": False}

    def auto_execute():
        if not executed["done"]:
            execute_stabilization(state)
            executed["done"] = True

    timer = threading.Timer(timeout, auto_execute)
    timer.start()

    return {
        "title": "SYSTEM COLLAPSE IMMINENT",
        "button": "EXECUTE STABILIZATION",
        "timeout": timeout,
        "on_click": lambda: (
            timer.cancel(),
            executed.__setitem__("done", True),
            execute_stabilization(state)
        )
    }

