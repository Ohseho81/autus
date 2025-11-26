from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Core 9 packs
from server.routes.emo_cmms import router as emo_cmms_router
from server.routes.jeju_school import router as jeju_school_router
from server.routes.nba_atb import router as nba_atb_router
from server.routes.local_memory import router as local_memory_router
from server.routes.style_analyzer import router as style_analyzer_router
from server.routes.zero_identity import router as zero_identity_router
from server.routes.autogen_cells import router as autogen_cells_router
from server.routes.pack_factory import router as pack_factory_router
from server.routes.meta_tester import router as meta_tester_router

# 13 additional packs (19 modules)
from server.routes.device_bridge import router as device_bridge_router
from server.routes.erp_adapter import router as erp_adapter_router
from server.routes.flow_orchestrator import router as flow_orchestrator_router
from server.routes.habit_tracker import router as habit_tracker_router
from server.routes.hello import router as hello_router
from server.routes.history_timeline import router as history_timeline_router
from server.routes.identity_core import router as identity_core_router
from server.routes.pattern_learner import router as pattern_learner_router
from server.routes.preference_vector import router as preference_vector_router
from server.routes.privacy_guard import router as privacy_guard_router
from server.routes.risk_monitor import router as risk_monitor_router
from server.routes.runtime_controller import router as runtime_controller_router
from server.routes.saas_adapter import router as saas_adapter_router

app = FastAPI(title="AUTUS", version="0.3.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "ok", "service": "AUTUS", "version": "0.3.1", "endpoints": 22}

# Core 9 packs
app.include_router(emo_cmms_router)
app.include_router(jeju_school_router)
app.include_router(nba_atb_router)
app.include_router(local_memory_router)
app.include_router(style_analyzer_router)
app.include_router(zero_identity_router)
app.include_router(autogen_cells_router)
app.include_router(pack_factory_router)
app.include_router(meta_tester_router)

# 13 additional packs
app.include_router(device_bridge_router)
app.include_router(erp_adapter_router)
app.include_router(flow_orchestrator_router)
app.include_router(habit_tracker_router)
app.include_router(hello_router)
app.include_router(history_timeline_router)
app.include_router(identity_core_router)
app.include_router(pattern_learner_router)
app.include_router(preference_vector_router)
app.include_router(privacy_guard_router)
app.include_router(risk_monitor_router)
app.include_router(runtime_controller_router)
app.include_router(saas_adapter_router)


# Auto-generated: weather_api
from server.routes.weather_api import router as weather_api_router
app.include_router(weather_api_router, tags=["weather_api"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server.main:app", host="127.0.0.1", port=8000, reload=True)
