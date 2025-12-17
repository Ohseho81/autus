# Redirect to app.main
from app.main import app, ENGINE
import json

# Realtime routes
from fastapi.responses import StreamingResponse
import asyncio

@app.get("/stream")
async def stream_status():
    async def generate():
        while True:
            try:
                status = ENGINE.snapshot()
                sig = status.get("signals", {})
                twin = {
                    "t": status.get("tick", 0),
                    "e": round(sig.get("entropy", 0), 4),
                    "p": round(sig.get("pressure", 0), 4),
                    "r": round(sig.get("release", 0), 4),
                    "g": round(sig.get("gravity", 0.5), 4),
                    "s": status.get("output", {}).get("status", "GREEN")
                }
                yield f"data: {json.dumps(twin)}\n\n"
            except Exception as ex:
                yield f"data: {json.dumps({'error': str(ex)})}\n\n"
            await asyncio.sleep(0.3)
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Access-Control-Allow-Origin": "*"}
    )

@app.get("/status/batch")
async def batch_status():
    status = ENGINE.snapshot()
    sig = status.get("signals", {})
    out = status.get("output", {})
    
    twin = {
        "timeSec": status.get("tick", 0),
        "energy": sig.get("gravity", 0.5),
        "flow": sig.get("release", 0),
        "risk": min(1, sig.get("entropy", 0) * 1.5 + sig.get("pressure", 0) * 0.5),
        "entropy": sig.get("entropy", 0),
        "pressure": sig.get("pressure", 0)
    }
    
    uniforms = {
        "u_time": twin["timeSec"] % 1000,
        "u_energy": twin["energy"],
        "u_flow": twin["flow"],
        "u_risk": twin["risk"],
        "u_entropy": twin["entropy"],
        "u_pressure": twin["pressure"]
    }
    
    motion = {
        "spin": {"omega": 0.3 + twin["energy"] * 0.1},
        "sweep": {"omega": 1.0 + twin["risk"] * 1.5},
        "pulse": {"amp": 0.1 + twin["energy"] * 0.15, "freq": 0.8},
        "flicker": {"sigma": 0.02 + twin["entropy"] * 0.08}
    }
    
    return {
        "status": status,
        "twin": twin,
        "uniforms": uniforms,
        "motion": motion,
        "beacon": {"state": out.get("status", "GREEN")}
    }
