from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.state import restore_on_startup
from app.api.routes import health, actions, view, selfcheck, replay

app = FastAPI(title=settings.app_name, version=settings.version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    restore_on_startup()


# API Routes
app.include_router(health.router)      # GET /health
app.include_router(view.router)        # GET /physics/view
app.include_router(actions.router)     # POST /action/apply, POST /state/reset
app.include_router(selfcheck.router)   # POST /selfcheck/submit
app.include_router(replay.router)      # GET /replay/events, POST /replay/run


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
