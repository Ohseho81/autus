from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from server.routes.emo_cmms import router as emo_cmms_router
from server.routes.jeju_school import router as jeju_school_router
from server.routes.nba_atb import router as nba_atb_router
from server.routes.local_memory import router as local_memory_router
from server.routes.style_analyzer import router as style_analyzer_router
from server.routes.zero_identity import router as zero_identity_router
from server.routes.autogen_cells import router as autogen_cells_router
from server.routes.pack_factory import router as pack_factory_router
from server.routes.meta_tester import router as meta_tester_router
app = FastAPI(
    title="AUTUS",
    version="0.3.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/")
async def root():
    return {"status": "ok", "service": "AUTUS", "version": "0.3.0"}
# -------- Core 6 packs --------
app.include_router(emo_cmms_router)
app.include_router(jeju_school_router)
app.include_router(nba_atb_router)
app.include_router(local_memory_router)
app.include_router(style_analyzer_router)
app.include_router(zero_identity_router)
# -------- Autogen / meta packs --------
app.include_router(autogen_cells_router)
app.include_router(pack_factory_router)
app.include_router(meta_tester_router)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server.main:app", host="127.0.0.1", port=8000, reload=True)
