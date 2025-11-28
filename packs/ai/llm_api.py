"""
llm_api.py
- FastAPI 라우터: /api/llm 엔드포인트에서 LLMRouter를 통해 최적 LLM 자동 선택 및 호출
"""
from fastapi import APIRouter, Query
from packs.ai.llm_router import LLMRouter

router = APIRouter()
llm_router = LLMRouter()

@router.post('/api/llm')
def call_llm(prompt: str = Query(...), purpose: str = Query(None)):
    result = llm_router.route(prompt, purpose=purpose)
    return {"result": result}

@router.get('/api/llm/health')
def llm_health():
    return llm_router.all_health()
