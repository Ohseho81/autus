# backend/integrations/metadata_api.py
"""
메타데이터 API 엔드포인트

Zero Meaning 원칙을 유지하면서 UI 표시용 메타데이터 제공
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel

from .node_metadata import metadata_store, NodeMetadata, init_sample_metadata


router = APIRouter(prefix="/metadata", tags=["Metadata"])


# ═══════════════════════════════════════════════════════════════
# Request/Response Models
# ═══════════════════════════════════════════════════════════════

class SetMetadataRequest(BaseModel):
    node_id: str
    display_name: Optional[str] = None
    type: str = "unknown"
    tags: List[str] = []
    source: Optional[str] = None
    location: Optional[dict] = None
    custom: Optional[dict] = None


class BatchSetRequest(BaseModel):
    items: List[SetMetadataRequest]


class MinimalMetadata(BaseModel):
    """최소 메타데이터 (Zero Meaning 호환)"""
    node_id: str
    display_name: str


# ═══════════════════════════════════════════════════════════════
# CRUD Endpoints
# ═══════════════════════════════════════════════════════════════

@router.post("/set")
async def set_metadata(data: SetMetadataRequest):
    """
    메타데이터 설정
    
    Example:
    ```json
    {
      "node_id": "n_abc123",
      "display_name": "카페A 강남점",
      "type": "customer",
      "tags": ["vip", "월정기"]
    }
    ```
    """
    meta = NodeMetadata(
        node_id=data.node_id,
        display_name=data.display_name,
        type=data.type,
        tags=data.tags,
        source=data.source,
        location=data.location,
        custom=data.custom
    )
    result = metadata_store.set(data.node_id, meta)
    return {"success": True, "node_id": data.node_id, "metadata": result}


@router.post("/batch/set")
async def batch_set_metadata(data: BatchSetRequest):
    """여러 메타데이터 일괄 설정"""
    results = []
    for item in data.items:
        meta = NodeMetadata(
            node_id=item.node_id,
            display_name=item.display_name,
            type=item.type,
            tags=item.tags,
            source=item.source,
            location=item.location,
            custom=item.custom
        )
        metadata_store.set(item.node_id, meta)
        results.append(item.node_id)
    
    return {"success": True, "count": len(results), "node_ids": results}


@router.get("/get/{node_id}")
async def get_metadata(node_id: str):
    """
    메타데이터 조회
    
    없으면 기본값 반환 (display_name = node_id 앞 6자리)
    """
    meta = metadata_store.get(node_id)
    if meta:
        return meta
    
    # Zero Meaning 기본값
    return MinimalMetadata(
        node_id=node_id,
        display_name=node_id[:6] if len(node_id) >= 6 else node_id
    )


@router.get("/batch")
async def get_batch_metadata(node_ids: str = Query(..., description="쉼표로 구분된 node_id 목록")):
    """
    여러 노드 메타데이터 일괄 조회
    
    Example: /metadata/batch?node_ids=P01,P02,P03
    """
    ids = [nid.strip() for nid in node_ids.split(",") if nid.strip()]
    result = {}
    
    for nid in ids:
        meta = metadata_store.get(nid)
        if meta:
            result[nid] = meta.dict()
        else:
            result[nid] = {
                "node_id": nid,
                "display_name": nid[:6] if len(nid) >= 6 else nid
            }
    
    return result


@router.delete("/delete/{node_id}")
async def delete_metadata(node_id: str):
    """메타데이터 삭제"""
    success = metadata_store.delete(node_id)
    return {"success": success, "node_id": node_id}


# ═══════════════════════════════════════════════════════════════
# Search Endpoints
# ═══════════════════════════════════════════════════════════════

@router.get("/search/type/{type}")
async def search_by_type(type: str):
    """
    타입별 검색
    
    타입 종류: customer, vendor, employee, investor, partner, unknown
    """
    results = metadata_store.search_by_type(type)
    return {"type": type, "count": len(results), "items": results}


@router.get("/search/tag/{tag}")
async def search_by_tag(tag: str):
    """
    태그별 검색
    
    예: vip, 월정기, family, 2024신규
    """
    results = metadata_store.search_by_tag(tag)
    return {"tag": tag, "count": len(results), "items": results}


@router.get("/search/source/{source}")
async def search_by_source(source: str):
    """
    소스별 검색
    
    소스 종류: stripe, toss, shopify, manual
    """
    results = metadata_store.search_by_source(source)
    return {"source": source, "count": len(results), "items": results}


# ═══════════════════════════════════════════════════════════════
# List & Stats Endpoints
# ═══════════════════════════════════════════════════════════════

@router.get("/list")
async def list_metadata(limit: int = 100, offset: int = 0):
    """전체 메타데이터 목록 (페이징)"""
    items = metadata_store.list_all(limit=limit, offset=offset)
    return {
        "total": metadata_store.count(),
        "limit": limit,
        "offset": offset,
        "items": items
    }


@router.get("/stats")
async def get_stats():
    """메타데이터 통계"""
    return metadata_store.stats()


# ═══════════════════════════════════════════════════════════════
# Display Name Helper
# ═══════════════════════════════════════════════════════════════

@router.get("/display-name/{node_id}")
async def get_display_name(node_id: str):
    """
    표시 이름만 조회 (UI용)
    
    Zero Meaning: 메타데이터 없으면 ID 앞 6자리 반환
    """
    name = metadata_store.get_display_name(node_id)
    return {"node_id": node_id, "display_name": name}


@router.get("/display-names")
async def get_display_names(node_ids: str = Query(...)):
    """여러 노드 표시 이름 조회"""
    ids = [nid.strip() for nid in node_ids.split(",") if nid.strip()]
    result = {}
    for nid in ids:
        result[nid] = metadata_store.get_display_name(nid)
    return result


# ═══════════════════════════════════════════════════════════════
# 초기화
# ═══════════════════════════════════════════════════════════════

@router.post("/init-samples")
async def initialize_samples():
    """샘플 데이터 초기화 (개발용)"""
    count = init_sample_metadata()
    return {"success": True, "initialized": count}


@router.get("/health")
async def metadata_health():
    """메타데이터 서비스 헬스체크"""
    return {
        "status": "healthy",
        "service": "metadata",
        "total_entries": metadata_store.count()
    }
