from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from .api.routes import router

app = FastAPI(title="AUTUS Local", version="0.1.0", docs_url="/docs", redoc_url=None)
app.include_router(router)

static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")
    @app.get("/ui")
    def ui():
        return FileResponse(os.path.join(static_dir, "index.html"))
    
    @app.get("/map")
    def physics_map():
        """Physics Map - Goal → Physics Visualization"""
        return FileResponse(os.path.join(static_dir, "physics-map.html"))
    
    @app.get("/network")
    def goal_network():
        """Goal Network - Connection Layer Visualization"""
        return FileResponse(os.path.join(static_dir, "goal-network.html"))

@app.get("/")
def root():
    return {"name": "AUTUS Local", "version": "0.1.0", "local_only": True}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)







