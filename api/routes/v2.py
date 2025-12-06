from fastapi import APIRouter

router = APIRouter(prefix="/api/v2", tags=["v2"])

@router.get("/health")
async def health_v2():
    return {"status": "ok", "version": "v2", "features": ["websocket", "email", "oidc"]}

@router.get("/info")
async def info_v2():
    return {
        "version": "v2",
        "endpoints": ["/health", "/info", "/stats"],
        "features": ["websocket", "email", "oidc", "rate-limiting"],
        "deprecated": False
    }

@router.get("/stats")
async def stats_v2():
    return {
        "api_version": "v2",
        "total_endpoints": 95,
        "tests_passing": 73
    }
