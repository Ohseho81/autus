# AUTUS 추천 API FastAPI 라우터 연결 (modular import)
from packs.ai.recommend_api import router as recommend_router

def register_recommend_api(app):
    app.include_router(recommend_router)
