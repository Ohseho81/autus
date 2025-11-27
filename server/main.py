from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware


# Core 9 packs
from server.routes.triple_sphere import router as triple_sphere_router
from server.routes.emo_cmms import router as emo_cmms_router
from server.routes.jeju_school import router as jeju_school_router
from server.routes.nba_atb import router as nba_atb_router
from server.routes.local_memory import router as local_memory_router
from server.routes.style_analyzer import router as style_analyzer_router
from server.routes.zero_identity import router as zero_identity_router
from server.routes.autogen_cells import router as autogen_cells_router
from server.routes.pack_factory import router as pack_factory_router

from server.routes.meta_tester import router as meta_tester_router
from server.routes.api import router as api_router

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
app.include_router(triple_sphere_router)
app.include_router(emo_cmms_router)
app.include_router(jeju_school_router)
app.include_router(nba_atb_router)
app.include_router(local_memory_router)
app.include_router(style_analyzer_router)
app.include_router(zero_identity_router)
app.include_router(autogen_cells_router)
app.include_router(pack_factory_router)

app.include_router(meta_tester_router)
app.include_router(api_router, prefix="/api", tags=["api"])

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


# Auto-generated: payment
from server.routes.payment import router as payment_router
app.include_router(payment_router, tags=["payment"])


# Auto-generated: analytics, notification, scheduler
from server.routes.analytics import router as analytics_router
from server.routes.notification import router as notification_router
from server.routes.scheduler import router as scheduler_router
app.include_router(analytics_router, tags=["analytics"])
app.include_router(notification_router, tags=["notification"])
app.include_router(scheduler_router, tags=["scheduler"])


# Auto-generated: chat, billing, report
from server.routes.chat import router as chat_router
from server.routes.billing import router as billing_router
from server.routes.report import router as report_router
app.include_router(chat_router, tags=["chat"])
app.include_router(billing_router, tags=["billing"])
app.include_router(report_router, tags=["report"])


# Auto-generated: analyzer, fixer, validator
from server.routes.analyzer import router as analyzer_router
from server.routes.fixer import router as fixer_router
from server.routes.validator import router as validator_router
from server.routes.auth import router as auth_router
from server.routes.visualizer import router as visualizer_router
from server.routes.nodes import router as nodes_router
from server.routes.triple_sphere import router as triple_sphere_router
app.include_router(analyzer_router, tags=["analyzer"])
app.include_router(fixer_router, tags=["fixer"])
app.include_router(validator_router, tags=["validator"])

app.include_router(nodes_router, tags=["3d-nodes"])
app.include_router(visualizer_router, tags=["visualizer"])
app.include_router(auth_router, tags=["auth"])


# AUTUS LLM API 라우터 등록
from server.routes.llm import register_llm_api
register_llm_api(app)

# AUTUS 추천 API 라우터 등록
from server.routes.recommend import register_recommend_api
register_recommend_api(app)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server.main:app", host="127.0.0.1", port=8000, reload=True)


# Static files
app.mount("/static", StaticFiles(directory="static"), name="static")


# WebSocket endpoint
@app.websocket("/stream")
async def websocket_stream(websocket: WebSocket):
    await websocket.accept()
    try:
        await websocket.send_json({"type": "connected", "message": "AUTUS 3D Stream"})
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({"type": "ack", "data": data})
    except Exception as e:
        print(f"WS closed: {e}")
