"""Test if /metrics route is registered"""
import sys
sys.path.insert(0, '/Users/oseho/Desktop/autus')

from fastapi import FastAPI
from fastapi.responses import Response

app = FastAPI()

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    from api.prometheus_metrics import get_metrics_text
    return Response(content=get_metrics_text(), media_type="text/plain")

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    
    # Print all routes
    print("=== Registered Routes ===")
    for route in app.routes:
        print(f"  {route.path} - {route.methods if hasattr(route, 'methods') else 'N/A'}")
    
    print("\nStarting test server on port 8004...")
    uvicorn.run(app, host="0.0.0.0", port=8004)
