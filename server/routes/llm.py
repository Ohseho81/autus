
# AUTUS LLM API FastAPI 라우터 연결 (modular import)
from packs.ai.llm_api import router as llm_router

def register_llm_api(app):
    app.include_router(llm_router)
