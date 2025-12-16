"""
AUTUS Marketplace API
제9법칙: 다양성 - Pack 생태계

Pack 등록, 검색, 다운로드, 평가
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import Optional, List
from pydantic import BaseModel
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from marketplace.registry import get_registry, PackRegistry
from marketplace.search import get_search, PackSearch

router = APIRouter(prefix="/marketplace", tags=["Marketplace"])

_registry = get_registry()
_search = get_search()


# ============ Models ============

class PackRegisterRequest(BaseModel):
    pack_path: str
    author: str = "anonymous"

class PackRateRequest(BaseModel):
    score: int  # 1-5


# ============ 등록 & 조회 ============

@router.post("/register")
async def register_pack(request: PackRegisterRequest):
    """Pack 등록"""
    try:
        entry = _registry.register(request.pack_path, request.author)
        return {"success": True, "pack": entry}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/packs")
async def list_packs():
    """전체 Pack 목록"""
    return {"packs": _registry.list_all(), "total": len(_registry.list_all())}


@router.get("/packs/{pack_id}")
async def get_pack(pack_id: str):
    """Pack 상세 조회"""
    pack = _registry.get(pack_id)
    if not pack:
        raise HTTPException(status_code=404, detail="Pack not found")
    return pack


@router.get("/download/{pack_id}")
async def download_pack(pack_id: str):
    """Pack 다운로드"""
    result = _registry.download(pack_id)
    if not result:
        raise HTTPException(status_code=404, detail="Pack not found")
    return result


@router.delete("/packs/{pack_id}")
async def delete_pack(pack_id: str):
    """Pack 삭제"""
    if _registry.delete(pack_id):
        return {"success": True, "deleted": pack_id}
    raise HTTPException(status_code=404, detail="Pack not found")


# ============ 평가 ============

@router.post("/rate/{pack_id}")
async def rate_pack(pack_id: str, request: PackRateRequest):
    """Pack 평가 (1-5점)"""
    result = _registry.rate(pack_id, request.score)
    if not result:
        raise HTTPException(status_code=404, detail="Pack not found")
    return {"success": True, "pack": result}


# ============ 검색 ============

@router.get("/search")
async def search_packs(
    q: str = "",
    tag: Optional[str] = None,
    author: Optional[str] = None,
    sort: str = "downloads",
    limit: int = 20
):
    """Pack 검색"""
    tags = [tag] if tag else None
    results = _search.search(
        query=q,
        tags=tags,
        author=author,
        sort_by=sort,
        limit=limit
    )
    return {"results": results, "total": len(results)}


@router.get("/trending")
async def trending_packs(limit: int = 10):
    """인기 Pack"""
    return {"packs": _search.trending(limit)}


@router.get("/top-rated")
async def top_rated_packs(limit: int = 10):
    """평점 높은 Pack"""
    return {"packs": _search.top_rated(limit)}


@router.get("/recent")
async def recent_packs(limit: int = 10):
    """최신 Pack"""
    return {"packs": _search.recent(limit)}


@router.get("/tags")
async def get_tags():
    """모든 태그 목록"""
    return {"tags": _search.get_all_tags()}


@router.get("/tags/{tag}")
async def packs_by_tag(tag: str, limit: int = 20):
    """태그별 Pack"""
    return {"tag": tag, "packs": _search.by_tag(tag, limit)}


# ============ 통계 ============

@router.get("/stats")
async def marketplace_stats():
    """마켓플레이스 통계"""
    return _search.stats()
