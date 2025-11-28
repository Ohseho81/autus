from fastapi import APIRouter

router = APIRouter(tags=["health"])

@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "autus"}

@router.get("/api/health")
async def api_health():
    return {"status": "ok", "version": "3.0.0"}
