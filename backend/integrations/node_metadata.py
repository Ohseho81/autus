# backend/integrations/node_metadata.py
"""
노드 메타데이터 레이어

Zero Meaning 원칙:
- Physics Map은 node_id + value만 사용 (의미 없는 숫자)
- 메타데이터는 별도 레이어에서 선택적 조회 (UI 표시용)
"""

from typing import Dict, List, Optional
from pydantic import BaseModel
from datetime import datetime


class NodeMetadata(BaseModel):
    """노드 메타데이터 (Zero Meaning 분리)"""
    node_id: str
    display_name: Optional[str] = None
    type: str = "unknown"  # customer, vendor, employee, investor, partner
    tags: List[str] = []
    source: Optional[str] = None  # stripe, toss, shopify, manual
    location: Optional[Dict[str, float]] = None  # {"lat": 37.5, "lng": 126.9}
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    custom: Optional[Dict] = None  # 추가 커스텀 필드


class MetadataStore:
    """
    메타데이터 저장소 (In-Memory)
    
    Production에서는 Redis 또는 PostgreSQL로 교체 가능
    """
    
    def __init__(self):
        self._store: Dict[str, NodeMetadata] = {}
        self._type_index: Dict[str, set] = {}  # type -> node_ids
        self._tag_index: Dict[str, set] = {}   # tag -> node_ids
    
    def set(self, node_id: str, metadata: NodeMetadata) -> NodeMetadata:
        """메타데이터 설정 (인덱스 업데이트 포함)"""
        # 기존 데이터 정리
        old = self._store.get(node_id)
        if old:
            self._remove_from_index(node_id, old)
        
        # 타임스탬프 설정
        now = datetime.utcnow().isoformat()
        if not metadata.created_at:
            metadata.created_at = now
        metadata.updated_at = now
        
        # 저장
        self._store[node_id] = metadata
        self._add_to_index(node_id, metadata)
        
        return metadata
    
    def get(self, node_id: str) -> Optional[NodeMetadata]:
        """메타데이터 조회"""
        return self._store.get(node_id)
    
    def get_display_name(self, node_id: str) -> str:
        """표시 이름 (없으면 ID 앞 6자리)"""
        meta = self._store.get(node_id)
        if meta and meta.display_name:
            return meta.display_name
        return node_id[:6] if len(node_id) >= 6 else node_id
    
    def get_batch(self, node_ids: List[str]) -> Dict[str, Optional[NodeMetadata]]:
        """여러 노드 메타데이터 일괄 조회"""
        return {nid: self._store.get(nid) for nid in node_ids}
    
    def delete(self, node_id: str) -> bool:
        """메타데이터 삭제"""
        if node_id in self._store:
            meta = self._store.pop(node_id)
            self._remove_from_index(node_id, meta)
            return True
        return False
    
    def search_by_type(self, type: str) -> List[NodeMetadata]:
        """타입별 검색 (customer, vendor, employee, investor)"""
        node_ids = self._type_index.get(type, set())
        return [self._store[nid] for nid in node_ids if nid in self._store]
    
    def search_by_tag(self, tag: str) -> List[NodeMetadata]:
        """태그별 검색 (vip, monthly, etc)"""
        node_ids = self._tag_index.get(tag, set())
        return [self._store[nid] for nid in node_ids if nid in self._store]
    
    def search_by_source(self, source: str) -> List[NodeMetadata]:
        """소스별 검색 (stripe, toss, shopify)"""
        return [m for m in self._store.values() if m.source == source]
    
    def list_all(self, limit: int = 100, offset: int = 0) -> List[NodeMetadata]:
        """전체 목록 (페이징)"""
        all_items = list(self._store.values())
        return all_items[offset:offset + limit]
    
    def count(self) -> int:
        """총 개수"""
        return len(self._store)
    
    def stats(self) -> Dict:
        """통계"""
        type_counts = {t: len(ids) for t, ids in self._type_index.items()}
        tag_counts = {t: len(ids) for t, ids in self._tag_index.items()}
        return {
            "total": len(self._store),
            "by_type": type_counts,
            "by_tag": tag_counts
        }
    
    # ═══════════════════════════════════════════════════════════════
    # Private: 인덱스 관리
    # ═══════════════════════════════════════════════════════════════
    
    def _add_to_index(self, node_id: str, meta: NodeMetadata):
        """인덱스에 추가"""
        # 타입 인덱스
        if meta.type not in self._type_index:
            self._type_index[meta.type] = set()
        self._type_index[meta.type].add(node_id)
        
        # 태그 인덱스
        for tag in meta.tags:
            if tag not in self._tag_index:
                self._tag_index[tag] = set()
            self._tag_index[tag].add(node_id)
    
    def _remove_from_index(self, node_id: str, meta: NodeMetadata):
        """인덱스에서 제거"""
        # 타입 인덱스
        if meta.type in self._type_index:
            self._type_index[meta.type].discard(node_id)
        
        # 태그 인덱스
        for tag in meta.tags:
            if tag in self._tag_index:
                self._tag_index[tag].discard(node_id)


# ═══════════════════════════════════════════════════════════════
# 글로벌 인스턴스
# ═══════════════════════════════════════════════════════════════

metadata_store = MetadataStore()


# ═══════════════════════════════════════════════════════════════
# 샘플 데이터 초기화 (개발용)
# ═══════════════════════════════════════════════════════════════

def init_sample_metadata():
    """샘플 메타데이터 초기화"""
    samples = [
        NodeMetadata(
            node_id="P01",
            display_name="오세호",
            type="investor",
            tags=["founder", "vip"],
            source="manual",
            location={"lat": 37.5665, "lng": 126.9780}
        ),
        NodeMetadata(
            node_id="P02",
            display_name="김경희",
            type="investor",
            tags=["family", "vip"],
            source="manual",
            location={"lat": 37.5700, "lng": 126.9850}
        ),
        NodeMetadata(
            node_id="P03",
            display_name="오선우",
            type="employee",
            tags=["family"],
            source="manual",
            location={"lat": 37.5600, "lng": 126.9700}
        ),
        NodeMetadata(
            node_id="P04",
            display_name="오연우",
            type="employee",
            tags=["family"],
            source="manual",
            location={"lat": 37.5550, "lng": 126.9900}
        ),
        NodeMetadata(
            node_id="P05",
            display_name="오은우",
            type="employee",
            tags=["family"],
            source="manual",
            location={"lat": 37.5750, "lng": 126.9650}
        ),
        NodeMetadata(
            node_id="C001",
            display_name="카페A 강남점",
            type="customer",
            tags=["vip", "월정기", "2024신규"],
            source="toss"
        ),
        NodeMetadata(
            node_id="C002",
            display_name="음식점B 홍대점",
            type="customer",
            tags=["월정기"],
            source="stripe"
        ),
        NodeMetadata(
            node_id="V001",
            display_name="식자재 공급업체",
            type="vendor",
            tags=["식자재", "계약"],
            source="manual"
        ),
    ]
    
    for meta in samples:
        metadata_store.set(meta.node_id, meta)
    
    return len(samples)
