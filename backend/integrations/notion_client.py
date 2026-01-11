"""
═══════════════════════════════════════════════════════════════════════════════
📝 AUTUS Notion Integration
═══════════════════════════════════════════════════════════════════════════════

Notion API를 통한 데이터 동기화
- 데이터베이스 읽기/쓰기
- 페이지 생성/업데이트
- Zero Meaning 변환 후 저장
"""

import os
import logging
from typing import Optional, Dict, List, Any
from datetime import datetime
from dataclasses import dataclass
import httpx

logger = logging.getLogger("autus.notion")


# ═══════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════

NOTION_API_VERSION = "2022-06-28"
NOTION_BASE_URL = "https://api.notion.com/v1"


@dataclass
class NotionConfig:
    """Notion 설정"""
    api_key: str
    database_id: Optional[str] = None
    
    @classmethod
    def from_env(cls) -> "NotionConfig":
        """환경 변수에서 설정 로드"""
        return cls(
            api_key=os.getenv("NOTION_API_KEY", ""),
            database_id=os.getenv("NOTION_DATABASE_ID"),
        )


# ═══════════════════════════════════════════════════════════════════════════════
# Notion 클라이언트
# ═══════════════════════════════════════════════════════════════════════════════

class NotionClient:
    """Notion API 클라이언트"""
    
    def __init__(self, config: Optional[NotionConfig] = None):
        self.config = config or NotionConfig.from_env()
        self._client: Optional[httpx.AsyncClient] = None
    
    @property
    def headers(self) -> Dict[str, str]:
        """API 헤더"""
        return {
            "Authorization": f"Bearer {self.config.api_key}",
            "Notion-Version": NOTION_API_VERSION,
            "Content-Type": "application/json",
        }
    
    @property
    def client(self) -> httpx.AsyncClient:
        """HTTP 클라이언트"""
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=NOTION_BASE_URL,
                headers=self.headers,
                timeout=30.0,
            )
        return self._client
    
    async def close(self):
        """클라이언트 종료"""
        if self._client:
            await self._client.aclose()
            self._client = None
    
    # ─────────────────────────────────────────────────────────────────────────
    # 데이터베이스 작업
    # ─────────────────────────────────────────────────────────────────────────
    
    async def query_database(
        self,
        database_id: Optional[str] = None,
        filter: Optional[Dict] = None,
        sorts: Optional[List[Dict]] = None,
        page_size: int = 100,
    ) -> List[Dict]:
        """데이터베이스 쿼리"""
        db_id = database_id or self.config.database_id
        if not db_id:
            raise ValueError("database_id required")
        
        payload = {"page_size": page_size}
        if filter:
            payload["filter"] = filter
        if sorts:
            payload["sorts"] = sorts
        
        try:
            response = await self.client.post(
                f"/databases/{db_id}/query",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            return data.get("results", [])
        except httpx.HTTPError as e:
            logger.error(f"Notion query failed: {e}")
            raise
    
    async def get_database(self, database_id: Optional[str] = None) -> Dict:
        """데이터베이스 정보 조회"""
        db_id = database_id or self.config.database_id
        if not db_id:
            raise ValueError("database_id required")
        
        response = await self.client.get(f"/databases/{db_id}")
        response.raise_for_status()
        return response.json()
    
    # ─────────────────────────────────────────────────────────────────────────
    # 페이지 작업
    # ─────────────────────────────────────────────────────────────────────────
    
    async def create_page(
        self,
        database_id: Optional[str] = None,
        properties: Optional[Dict] = None,
        children: Optional[List[Dict]] = None,
    ) -> Dict:
        """페이지 생성"""
        db_id = database_id or self.config.database_id
        if not db_id:
            raise ValueError("database_id required")
        
        payload = {
            "parent": {"database_id": db_id},
            "properties": properties or {},
        }
        
        if children:
            payload["children"] = children
        
        response = await self.client.post("/pages", json=payload)
        response.raise_for_status()
        return response.json()
    
    async def update_page(
        self,
        page_id: str,
        properties: Dict,
    ) -> Dict:
        """페이지 업데이트"""
        response = await self.client.patch(
            f"/pages/{page_id}",
            json={"properties": properties},
        )
        response.raise_for_status()
        return response.json()
    
    async def get_page(self, page_id: str) -> Dict:
        """페이지 조회"""
        response = await self.client.get(f"/pages/{page_id}")
        response.raise_for_status()
        return response.json()
    
    # ─────────────────────────────────────────────────────────────────────────
    # AUTUS 특화 기능
    # ─────────────────────────────────────────────────────────────────────────
    
    async def sync_node_to_notion(
        self,
        node_id: str,
        node_data: Dict,
        database_id: Optional[str] = None,
    ) -> Dict:
        """노드 데이터를 Notion에 동기화"""
        properties = {
            "Name": {"title": [{"text": {"content": node_id}}]},
            "Value": {"number": node_data.get("value", 0)},
            "Tier": {"select": {"name": node_data.get("tier", "T4")}},
            "Updated": {"date": {"start": datetime.utcnow().isoformat()}},
        }
        
        # 기존 페이지 검색
        existing = await self.query_database(
            database_id=database_id,
            filter={
                "property": "Name",
                "title": {"equals": node_id},
            },
        )
        
        if existing:
            # 업데이트
            return await self.update_page(existing[0]["id"], properties)
        else:
            # 생성
            return await self.create_page(database_id=database_id, properties=properties)
    
    async def fetch_nodes_from_notion(
        self,
        database_id: Optional[str] = None,
    ) -> List[Dict]:
        """Notion에서 노드 데이터 가져오기"""
        pages = await self.query_database(database_id=database_id)
        
        nodes = []
        for page in pages:
            props = page.get("properties", {})
            
            # 프로퍼티 파싱
            name = ""
            if "Name" in props and props["Name"].get("title"):
                name = props["Name"]["title"][0]["text"]["content"]
            
            value = 0
            if "Value" in props and props["Value"].get("number") is not None:
                value = props["Value"]["number"]
            
            tier = "T4"
            if "Tier" in props and props["Tier"].get("select"):
                tier = props["Tier"]["select"]["name"]
            
            nodes.append({
                "id": page["id"],
                "node_id": name,
                "value": value,
                "tier": tier,
                "notion_url": page["url"],
            })
        
        return nodes


# ═══════════════════════════════════════════════════════════════════════════════
# Zero Meaning 변환
# ═══════════════════════════════════════════════════════════════════════════════

def notion_to_zero_meaning(page: Dict) -> Dict:
    """Notion 페이지를 Zero Meaning 형식으로 변환"""
    props = page.get("properties", {})
    
    # 숫자 ID 할당 (해시 기반)
    page_id = page.get("id", "")
    node_id = hash(page_id) % 1000000
    
    # 숫자 값 추출
    value = 0
    for key, prop in props.items():
        if prop.get("type") == "number" and prop.get("number") is not None:
            value = prop["number"]
            break
    
    return {
        "node_id": node_id,
        "value": value,
        "timestamp": datetime.utcnow().timestamp(),
        # 원본 데이터 제거 (Zero Meaning)
    }


# ═══════════════════════════════════════════════════════════════════════════════
# FastAPI 라우터
# ═══════════════════════════════════════════════════════════════════════════════

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

router = APIRouter(prefix="/api/notion", tags=["Notion Integration"])


class NotionSyncRequest(BaseModel):
    database_id: Optional[str] = None
    node_id: str
    value: float = 0
    tier: str = "T4"


class NotionQueryRequest(BaseModel):
    database_id: Optional[str] = None
    filter: Optional[Dict] = None


# 싱글턴 클라이언트
_notion_client: Optional[NotionClient] = None


def get_notion_client() -> NotionClient:
    global _notion_client
    if _notion_client is None:
        _notion_client = NotionClient()
    return _notion_client


@router.get("/status")
async def notion_status():
    """Notion 연동 상태"""
    config = NotionConfig.from_env()
    return {
        "connected": bool(config.api_key),
        "database_configured": bool(config.database_id),
    }


@router.post("/sync")
async def sync_to_notion(
    request: NotionSyncRequest,
    client: NotionClient = Depends(get_notion_client),
):
    """노드 데이터를 Notion에 동기화"""
    if not client.config.api_key:
        raise HTTPException(status_code=503, detail="Notion API key not configured")
    
    try:
        result = await client.sync_node_to_notion(
            node_id=request.node_id,
            node_data={"value": request.value, "tier": request.tier},
            database_id=request.database_id,
        )
        return {"success": True, "page_id": result.get("id")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/query")
async def query_notion(
    request: NotionQueryRequest,
    client: NotionClient = Depends(get_notion_client),
):
    """Notion 데이터베이스 쿼리"""
    if not client.config.api_key:
        raise HTTPException(status_code=503, detail="Notion API key not configured")
    
    try:
        pages = await client.query_database(
            database_id=request.database_id,
            filter=request.filter,
        )
        
        # Zero Meaning 변환
        nodes = [notion_to_zero_meaning(p) for p in pages]
        
        return {
            "success": True,
            "count": len(nodes),
            "nodes": nodes,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fetch")
async def fetch_from_notion(
    database_id: Optional[str] = None,
    client: NotionClient = Depends(get_notion_client),
):
    """Notion에서 노드 데이터 가져오기"""
    if not client.config.api_key:
        raise HTTPException(status_code=503, detail="Notion API key not configured")
    
    try:
        nodes = await client.fetch_nodes_from_notion(database_id=database_id)
        return {
            "success": True,
            "count": len(nodes),
            "nodes": nodes,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
# 내보내기
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    "NotionConfig",
    "NotionClient",
    "notion_to_zero_meaning",
    "router",
    "get_notion_client",
]
