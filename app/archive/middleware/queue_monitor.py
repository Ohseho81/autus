from fastapi import Request
from core.guardrail.loop import observe_queue

async def queue_monitor_middleware(request: Request, call_next):
    active = getattr(request.app.state, 'active_requests', 0)
    observe_queue(active)
    response = await call_next(request)
    return response
